/**
 * autentique-webhook — Recebe eventos do Autentique.
 * Validação: query param ?secret= deve bater com AUTENTIQUE_WEBHOOK_SECRET.
 * Ao receber document.signed, baixa o PDF assinado e salva em Storage.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const webhookSecret = Deno.env.get('AUTENTIQUE_WEBHOOK_SECRET');
  const autentiqueKey = Deno.env.get('AUTENTIQUE_API_KEY');
  if (!webhookSecret) return json({ error: 'Webhook not configured' }, 503);

  const url = new URL(req.url);
  const providedSecret = url.searchParams.get('secret');
  if (providedSecret !== webhookSecret) return json({ error: 'Invalid webhook secret' }, 401);

  try {
    const payload = await req.json();
    const event = payload?.event ?? payload?.type ?? '';
    const docId: string | undefined =
      payload?.document?.id ?? payload?.data?.document?.id ?? payload?.uuid;

    if (!docId) return json({ error: 'documento não identificado' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: lead } = await admin
      .from('crm_leads')
      .select('id, status, source')
      .eq('autentique_document_id', docId)
      .maybeSingle();

    if (!lead) {
      console.warn('Autentique webhook: nenhum lead para doc', docId);
      return json({ ok: true, ignored: true });
    }

    // Eventos: document.signed, signature.accepted, document.rejected, document.expired
    const eventStr = String(event).toLowerCase();
    let newContractStatus = 'sent';
    let signedPath: string | null = null;
    let eventType = 'contract_event';

    if (eventStr.includes('signed') || eventStr === 'document.signed') {
      newContractStatus = 'signed';
      eventType = 'contract_signed';

      // Baixa PDF assinado do Autentique se possível
      if (autentiqueKey) {
        try {
          const q = `query($id: UUID!) { document(id: $id) { id files { signed original } } }`;
          const r = await fetch('https://api.autentique.com.br/v2/graphql', {
            method: 'POST',
            headers: { Authorization: `Bearer ${autentiqueKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, variables: { id: docId } }),
          });
          const j = await r.json();
          const signedUrl: string | undefined = j?.data?.document?.files?.signed;
          if (signedUrl) {
            const pdfResp = await fetch(signedUrl);
            if (pdfResp.ok) {
              const pdfBytes = new Uint8Array(await pdfResp.arrayBuffer());
              const path = `${lead.id}/${docId}.pdf`;
              const up = await admin.storage.from('contracts').upload(path, pdfBytes, {
                contentType: 'application/pdf',
                upsert: true,
              });
              if (!up.error) signedPath = path;
              else console.error('Storage upload err', up.error);
            }
          }
        } catch (e) {
          console.error('Falha ao baixar/salvar PDF assinado', e);
        }
      }
    } else if (eventStr.includes('rejected') || eventStr.includes('refused')) {
      newContractStatus = 'rejected';
      eventType = 'contract_rejected';
    } else if (eventStr.includes('expired')) {
      newContractStatus = 'expired';
      eventType = 'contract_expired';
    }

    const patch: Record<string, unknown> = { contract_status: newContractStatus };
    if (newContractStatus === 'signed') {
      patch.contract_signed_at = new Date().toISOString();
      if (signedPath) patch.contract_signed_pdf_path = signedPath;
    }
    await admin.from('crm_leads').update(patch).eq('id', lead.id);

    await admin.from('crm_lead_history').insert({
      lead_id: lead.id,
      from_status: lead.status,
      to_status: lead.status,
      moved_by: null,
      reason: eventType,
      source_snapshot: lead.source,
      event_type: eventType,
      metadata: { autentique_document_id: docId, signed_path: signedPath, raw_event: event },
    });

    return json({ ok: true });
  } catch (err) {
    console.error('autentique-webhook fatal', err);
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
