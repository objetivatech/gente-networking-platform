/**
 * dispatch-hub-billing — Enviado quando um lead HUB entra em Qualificado.
 * Envia email placeholder de checkout. Provedor real será integrado em release futura.
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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    const { data: role } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'facilitador'])
      .maybeSingle();
    if (!role) return json({ error: 'Sem permissão' }, 403);

    const body = await req.json().catch(() => ({}));
    const leadId = body?.lead_id as string | undefined;
    if (!leadId) return json({ error: 'lead_id obrigatório' }, 400);

    const { data: lead } = await admin
      .from('crm_leads')
      .select('id, name, email, source')
      .eq('id', leadId)
      .single();
    if (!lead) return json({ error: 'Lead não encontrado' }, 404);

    // Envia email placeholder via edge function send-email já existente
    try {
      await admin.functions.invoke('send-email', {
        body: {
          to: lead.email,
          subject: 'Cobrança Gente HUB — próximos passos',
          html: `<p>Olá, ${lead.name}!</p>
                 <p>Você foi qualificado para o programa <strong>Gente HUB</strong>.
                 Em breve enviaremos o link de pagamento e o contrato para assinatura digital.</p>
                 <p>Se tiver dúvidas, responda este email.</p>`,
        },
      });
    } catch (e) {
      console.error('dispatch-hub-billing: falha no envio de email', e);
    }

    await admin.from('crm_leads').update({ payment_status: 'pending' }).eq('id', leadId);
    await admin.from('crm_lead_history').insert({
      lead_id: leadId,
      from_status: null,
      to_status: null,
      moved_by: userId,
      reason: 'hub_billing_email_sent',
      source_snapshot: lead.source,
      event_type: 'hub_billing_triggered',
      metadata: { email_to: lead.email },
    });

    return json({ success: true });
  } catch (err) {
    console.error('dispatch-hub-billing fatal', err);
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
