/**
 * send-contract — Cria documento no Autentique para um lead do CRM.
 * Admin-only. Salva autentique_document_id em crm_leads e loga em crm_lead_history.
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
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

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

    // Verifica papel admin
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) return json({ error: 'Apenas administradores podem enviar contratos' }, 403);

    if (!autentiqueKey) {
      return json({ error: 'AUTENTIQUE_API_KEY não configurada' }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const leadId = body?.lead_id as string | undefined;
    if (!leadId) return json({ error: 'lead_id obrigatório' }, 400);

    const { data: lead, error: leadErr } = await admin
      .from('crm_leads')
      .select('id, name, email, source, status, contract_status, autentique_document_id')
      .eq('id', leadId)
      .single();
    if (leadErr || !lead) return json({ error: 'Lead não encontrado' }, 404);
    if (lead.contract_status === 'sent' || lead.contract_status === 'signed') {
      return json({ error: 'Contrato já foi enviado' }, 409);
    }

    // Documento simples com HTML default. Em produção, aponte para um template PDF hospedado.
    const html = `
      <h1>Contrato de Adesão — Gente Networking</h1>
      <p>Contratante: ${escapeHtml(lead.name)} (${escapeHtml(lead.email)})</p>
      <p>Este documento formaliza a adesão do contratante ao programa Gente Networking / Gente HUB
      conforme condições comerciais previamente acordadas.</p>
      <p>Ao assinar, o contratante declara estar ciente e de acordo com os termos apresentados.</p>
    `;

    const mutation = `
      mutation CreateDoc($doc: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
        createDocument(document: $doc, signers: $signers, file: $file) { id name }
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
    try {
      const parsed = JSON.parse(respText);
      docId = parsed?.data?.createDocument?.id ?? null;
      if (!docId) {
        console.error('Autentique response sem doc id', parsed);
        return json({ error: 'Resposta inválida do Autentique', details: parsed }, 502);
      }
    } catch (e) {
      return json({ error: 'Resposta inválida do Autentique', raw: respText }, 502);
    }

    await admin
      .from('crm_leads')
      .update({
        autentique_document_id: docId,
        contract_status: 'sent',
        contract_sent_at: new Date().toISOString(),
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
      metadata: { autentique_document_id: docId },
    });

    return json({ success: true, autentique_document_id: docId });
  } catch (err) {
    console.error('send-contract fatal', err);
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
