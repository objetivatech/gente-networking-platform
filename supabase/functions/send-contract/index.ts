/**
 * send-contract — Cria documento no Autentique usando modelo configurável (v3.26.0).
 * Admin-only. Aceita template_id + variables, renderiza placeholders,
 * salva autentique_document_id + signing_url em crm_leads e loga em crm_lead_history.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AUTENTIQUE_URL = 'https://api.autentique.com.br/v2/graphql';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const autentiqueKey = Deno.env.get('AUTENTIQUE_API_KEY');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) return json({ error: 'Apenas administradores podem enviar contratos' }, 403);

    if (!autentiqueKey) return json({ error: 'AUTENTIQUE_API_KEY não configurada' }, 503);

    const body = await req.json().catch(() => ({}));
    const leadId = body?.lead_id as string | undefined;
    const templateId = body?.template_id as string | undefined;
    const variables = (body?.variables ?? {}) as Record<string, string>;
    if (!leadId) return json({ error: 'lead_id obrigatório' }, 400);

    const { data: lead, error: leadErr } = await admin
      .from('crm_leads')
      .select('id, name, email, phone, company, business_segment, source, status, contract_status, target_team_id')
      .eq('id', leadId)
      .single();
    if (leadErr || !lead) return json({ error: 'Lead não encontrado' }, 404);
    if (lead.contract_status === 'sent' || lead.contract_status === 'signed') {
      return json({ error: 'Contrato já foi enviado' }, 409);
    }

    // Buscar modelo (informado ou padrão)
    let template: {
      id: string;
      name: string;
      body_html: string;
      version: number;
    } | null = null;

    if (templateId) {
      const { data } = await admin
        .from('contract_templates')
        .select('id, name, body_html, version')
        .eq('id', templateId)
        .maybeSingle();
      template = data as typeof template;
    }
    if (!template) {
      const { data } = await admin
        .from('contract_templates')
        .select('id, name, body_html, version')
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();
      template = data as typeof template;
    }
    if (!template) {
      return json({ error: 'Nenhum modelo de contrato disponível. Cadastre um modelo padrão em /admin/contratos.' }, 400);
    }

    // Nome do grupo
    let teamName = '';
    if (lead.target_team_id) {
      const { data: t } = await admin.from('teams').select('name').eq('id', lead.target_team_id).maybeSingle();
      teamName = (t as { name?: string } | null)?.name ?? '';
    }

    const builtIn: Record<string, string> = {
      nome: lead.name,
      email: lead.email,
      empresa: lead.company ?? '',
      telefone: lead.phone ?? '',
      segmento: lead.business_segment ?? '',
      grupo: teamName,
      data_hoje: new Date().toLocaleDateString('pt-BR'),
    };
    const merged: Record<string, string> = { ...builtIn, ...variables };

    const html = renderTemplate(template.body_html, merged);

    const mutation = `
      mutation CreateDoc($doc: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
        createDocument(document: $doc, signers: $signers, file: $file) {
          id
          name
          signatures {
            public_id
            link { short_link }
          }
        }
      }
    `;

    const form = new FormData();
    form.append('operations', JSON.stringify({
      query: mutation,
      variables: {
        doc: { name: `Contrato Gente — ${lead.name}` },
        signers: [{ email: lead.email, action: 'SIGN' }],
        file: null,
      },
    }));
    form.append('map', JSON.stringify({ '0': ['variables.file'] }));
    form.append('0', new Blob([html], { type: 'text/html' }), 'contrato.html');

    const resp = await fetch(AUTENTIQUE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${autentiqueKey}` },
      body: form,
    });

    const respText = await resp.text();
    if (!resp.ok) {
      console.error('Autentique error', resp.status, respText);
      return json({ error: 'Falha ao criar documento no Autentique', status: resp.status, details: respText }, resp.status);
    }

    let docId: string | null = null;
    let signingUrl: string | null = null;
    try {
      const parsed = JSON.parse(respText);
      const doc = parsed?.data?.createDocument;
      docId = doc?.id ?? null;
      const sig = Array.isArray(doc?.signatures) ? doc.signatures[0] : null;
      signingUrl = sig?.link?.short_link ?? null;
      if (!docId) return json({ error: 'Resposta inválida do Autentique', details: parsed }, 502);
    } catch {
      return json({ error: 'Resposta inválida do Autentique', raw: respText }, 502);
    }

    await admin
      .from('crm_leads')
      .update({
        autentique_document_id: docId,
        contract_status: 'sent',
        contract_sent_at: new Date().toISOString(),
        contract_signing_url: signingUrl,
        contract_template_id: template.id,
        contract_template_version: template.version,
        contract_variables: merged,
      })
      .eq('id', leadId);

    await admin.from('crm_lead_history').insert({
      lead_id: leadId,
      from_status: lead.status,
      to_status: lead.status,
      moved_by: userId,
      reason: 'contract_sent',
      source_snapshot: lead.source,
      event_type: 'contract_sent',
      metadata: {
        autentique_document_id: docId,
        signing_url: signingUrl,
        template_id: template.id,
        template_version: template.version,
        template_name: template.name,
      },
    });

    return json({ success: true, autentique_document_id: docId, signing_url: signingUrl });
  } catch (err) {
    console.error('send-contract fatal', err);
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500);
  }
});

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null) return '';
    return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
