/**
 * dispatch-billing-charge — Emissão de cobrança de assinatura/plano (v3.37.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Admin-only. Cria o registro em billing_charges, envia o e-mail transacional
 * com a identidade visual do Gente e registra a trilha no CRM quando o
 * destinatário é um lead.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://comunidade.gentenetworking.com.br';
const LOGO_URL = `${APP_URL}/logo-gente-networking.png`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s: string) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function chargeEmail(opts: {
  name: string;
  planName: string;
  amountCents: number;
  dueDate: string;
  recurring: boolean;
  paymentUrl?: string | null;
}) {
  const due = new Date(`${opts.dueDate}T12:00:00`).toLocaleDateString('pt-BR');
  const cta = opts.paymentUrl
    ? `<p style="text-align:center;margin:28px 0;">
         <a href="${opts.paymentUrl}" style="background:#f7941d;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block;">Pagar agora</a>
       </p>`
    : `<p style="color:#475569;font-size:14px;">Em instantes você receberá o link de pagamento por este mesmo e-mail.</p>`;

  const content = `
    <h1 style="color:#1e3a5f;font-size:22px;margin:0 0 16px;">Cobrança ${escapeHtml(opts.planName)}</h1>
    <p style="color:#334155;font-size:15px;margin:0 0 16px;">Olá, ${escapeHtml(opts.name)}!</p>
    <p style="color:#334155;font-size:15px;margin:0 0 20px;">
      Segue o resumo da sua ${opts.recurring ? 'assinatura' : 'contratação'} no Gente Networking.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:14px 18px;background:#f8fafc;color:#64748b;font-size:13px;">Plano</td>
          <td style="padding:14px 18px;color:#1e3a5f;font-size:14px;font-weight:600;">${escapeHtml(opts.planName)}</td></tr>
      <tr><td style="padding:14px 18px;background:#f8fafc;color:#64748b;font-size:13px;">Valor</td>
          <td style="padding:14px 18px;color:#1e3a5f;font-size:14px;font-weight:600;">${brl(opts.amountCents)}${opts.recurring ? ' / período' : ''}</td></tr>
      <tr><td style="padding:14px 18px;background:#f8fafc;color:#64748b;font-size:13px;">Vencimento</td>
          <td style="padding:14px 18px;color:#1e3a5f;font-size:14px;font-weight:600;">${due}</td></tr>
    </table>
    ${cta}
    <p style="color:#64748b;font-size:13px;margin:0;">Dúvidas? Basta responder este e-mail.</p>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Gente Networking</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f0f4f8;margin:0;padding:0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f4f8;"><tr>
<td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(30,58,95,0.1);">
<tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d4a6f 100%);padding:32px 24px;text-align:center;">
<img src="${LOGO_URL}" alt="Gente Networking" style="max-width:280px;width:100%;height:auto;margin-bottom:12px;" />
<p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Conectando pessoas, gerando negócios</p></td></tr>
<tr><td style="padding:40px 32px;">${content}</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 32px;text-align:center;">
<p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} Gente Networking. Todos os direitos reservados.</p>
</td></tr></table></td></tr></table></body></html>`;
}

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
    if (!roleRow) return json({ error: 'Apenas administradores podem enviar cobranças' }, 403);

    const body = await req.json().catch(() => ({}));
    const subscriptionId = body?.subscription_id as string | undefined;
    const force = !!body?.force;
    if (!subscriptionId) return json({ error: 'subscription_id obrigatório' }, 400);

    const { data: sub } = await admin
      .from('billing_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();
    if (!sub) return json({ error: 'Assinatura não encontrada' }, 404);
    if (sub.status === 'canceled') return json({ error: 'Assinatura cancelada' }, 409);

    const { data: plan } = await admin
      .from('billing_plans')
      .select('id, name, plan_type, billing_interval, active')
      .eq('id', sub.plan_id)
      .maybeSingle();
    if (!plan) return json({ error: 'Plano não encontrado' }, 404);
    if (!plan.active) return json({ error: 'Plano inativo — ative-o antes de cobrar' }, 400);

    // Destinatário: lead do CRM ou membro da plataforma
    let name = '';
    let email = '';
    if (sub.lead_id) {
      const { data: lead } = await admin
        .from('crm_leads')
        .select('name, email, status')
        .eq('id', sub.lead_id)
        .maybeSingle();
      name = lead?.name ?? '';
      email = lead?.email ?? '';
    } else if (sub.profile_id) {
      const { data: prof } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', sub.profile_id)
        .maybeSingle();
      name = prof?.full_name ?? '';
      email = prof?.email ?? '';
    }
    if (!email) return json({ error: 'Destinatário sem e-mail cadastrado' }, 400);

    // Idempotência: não duplicar cobrança pendente/enviada do mesmo vencimento
    const dueDate = (body?.due_date as string) ?? sub.next_charge_date ??
      new Date().toISOString().slice(0, 10);

    const { data: existing } = await admin
      .from('billing_charges')
      .select('id, status')
      .eq('subscription_id', subscriptionId)
      .eq('due_date', dueDate)
      .in('status', ['pending', 'sent'])
      .maybeSingle();
    if (existing && !force) {
      return json(
        { error: 'Já existe cobrança em aberto para este vencimento. Use reenviar.' },
        409,
      );
    }

    const chargeId = existing?.id ?? null;
    let charge = existing;
    if (!chargeId) {
      const { data: created, error: cErr } = await admin
        .from('billing_charges')
        .insert({
          subscription_id: subscriptionId,
          plan_id: plan.id,
          lead_id: sub.lead_id,
          profile_id: sub.profile_id,
          amount_cents: sub.amount_cents,
          status: 'pending',
          due_date: dueDate,
          provider: sub.provider,
          created_by: userId,
        })
        .select('id, status')
        .single();
      if (cErr) return json({ error: cErr.message }, 400);
      charge = created;
    }

    const html = chargeEmail({
      name: name || 'tudo bem?',
      planName: plan.name,
      amountCents: sub.amount_cents,
      dueDate,
      recurring: plan.plan_type === 'recorrente',
      paymentUrl: (body?.payment_url as string) ?? null,
    });

    let emailOk = true;
    let emailError: string | null = null;
    try {
      const { error: sendErr } = await admin.functions.invoke('send-email', {
        body: { to: email, subject: `Cobrança ${plan.name} — Gente Networking`, html },
      });
      if (sendErr) throw sendErr;
    } catch (e) {
      emailOk = false;
      emailError = e instanceof Error ? e.message : String(e);
      console.error('dispatch-billing-charge: falha no e-mail', emailError);
    }

    await admin
      .from('billing_charges')
      .update({
        status: emailOk ? 'sent' : 'failed',
        payment_url: (body?.payment_url as string) ?? null,
        metadata: { email_to: email, error: emailError },
      })
      .eq('id', charge!.id);

    if (sub.status === 'draft' && emailOk) {
      await admin
        .from('billing_subscriptions')
        .update({ status: 'active' })
        .eq('id', subscriptionId);
    }

    if (sub.lead_id) {
      const { data: lead } = await admin
        .from('crm_leads')
        .select('status, source, payment_status')
        .eq('id', sub.lead_id)
        .maybeSingle();

      if (lead && lead.payment_status !== 'paid') {
        await admin
          .from('crm_leads')
          .update({ payment_status: 'pending' })
          .eq('id', sub.lead_id);
      }

      await admin.from('crm_lead_history').insert({
        lead_id: sub.lead_id,
        from_status: lead?.status ?? null,
        to_status: lead?.status ?? null,
        moved_by: userId,
        reason: `Cobrança ${plan.name} (${brl(sub.amount_cents)}) — venc. ${dueDate}`,
        source_snapshot: lead?.source ?? null,
        event_type: emailOk ? 'billing_charge_sent' : 'billing_charge_failed',
        metadata: { subscription_id: subscriptionId, charge_id: charge!.id },
      });
    }

    return json({ success: emailOk, charge_id: charge!.id, error: emailError }, emailOk ? 200 : 502);
  } catch (e) {
    console.error('dispatch-billing-charge', e);
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado' }, 500);
  }
});
