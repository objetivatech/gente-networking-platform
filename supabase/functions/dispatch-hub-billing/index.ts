/**
 * dispatch-hub-billing — Cobrança HUB idempotente + retry manual (v3.26.0).
 * Registra cada tentativa em hub_billing_events + crm_lead_history.
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

    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) return json({ error: 'Apenas administradores podem disparar cobranças' }, 403);

    const body = await req.json().catch(() => ({}));
    const leadId = body?.lead_id as string | undefined;
    const forceRetry = !!body?.force_retry;
    if (!leadId) return json({ error: 'lead_id obrigatório' }, 400);

    const { data: lead } = await admin
      .from('crm_leads')
      .select('id, name, email, source, status, payment_status, is_hub')
      .eq('id', leadId)
      .single();
    if (!lead) return json({ error: 'Lead não encontrado' }, 404);
    if (!lead.is_hub) return json({ error: 'Cobrança HUB só se aplica a leads Gente HUB' }, 400);
    if (lead.payment_status === 'paid') return json({ error: 'Lead já está pago' }, 409);

    // Idempotência: se já existe evento 'triggered' ou 'email_sent' recente e não é retry, bloquear
    const { data: prior } = await admin
      .from('hub_billing_events')
      .select('id, attempt, event_type')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5);
    const hasPrior = (prior ?? []).length > 0;
    if (hasPrior && !forceRetry) {
      return json({ error: 'Já existe cobrança em andamento. Use "Reenviar" para nova tentativa.' }, 409);
    }
    const nextAttempt = ((prior ?? [])[0]?.attempt ?? 0) + 1;

    // 1. Registrar tentativa
    await admin.from('hub_billing_events').insert({
      lead_id: leadId,
      event_type: forceRetry && hasPrior ? 'retry' : 'triggered',
      status: 'pending',
      attempt: nextAttempt,
      payload: { requested_by: userId },
      triggered_by: userId,
    });

    // 2. Enviar email
    let emailStatus: 'sent' | 'failed' = 'sent';
    let emailError: string | null = null;
    try {
      await admin.functions.invoke('send-email', {
        body: {
          to: lead.email,
          subject: 'Cobrança Gente HUB — próximos passos',
          html: `<p>Olá, ${escapeHtml(lead.name)}!</p>
                 <p>Você foi qualificado para o programa <strong>Gente HUB</strong>.
                 Em breve enviaremos o link de pagamento e o contrato para assinatura digital.</p>
                 <p>Se tiver dúvidas, responda este email.</p>`,
        },
      });
    } catch (e) {
      emailStatus = 'failed';
      emailError = e instanceof Error ? e.message : String(e);
      console.error('dispatch-hub-billing: falha email', e);
    }

    // 3. Registrar resultado do email
    await admin.from('hub_billing_events').insert({
      lead_id: leadId,
      event_type: emailStatus === 'sent' ? 'email_sent' : 'failed',
      status: emailStatus,
      attempt: nextAttempt,
      payload: { email_to: lead.email, error: emailError },
      triggered_by: userId,
    });

    // 4. Atualizar status pagamento
    if (lead.payment_status !== 'pending') {
      await admin.from('crm_leads').update({ payment_status: 'pending' }).eq('id', leadId);
    }

    // 5. Log histórico auditoria
    await admin.from('crm_lead_history').insert({
      lead_id: leadId,
      from_status: lead.status,
      to_status: lead.status,
      moved_by: userId,
      reason: emailStatus === 'sent' ? 'hub_billing_email_sent' : 'hub_billing_failed',
      source_snapshot: lead.source,
      event_type: emailStatus === 'sent' ? 'hub_billing_triggered' : 'hub_billing_failed',
      metadata: { email_to: lead.email, attempt: nextAttempt, retry: forceRetry, error: emailError },
    });

    return json({ success: true, attempt: nextAttempt, email_status: emailStatus });
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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
