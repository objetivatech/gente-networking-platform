/**
 * Asaas webhook — authenticated, provider-verified transactional financial events.
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * @copyright © 2026 Ranktop SEO Inteligente.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getSecret } from '../_shared/secrets.ts';
import { webhookGate, paymentState } from '../_shared/asaas-webhook-rules.ts';
import { asaasContext } from '../_shared/asaas.ts';
import { z } from 'npm:zod@3.23.8';

const schema = z.object({ id: z.string().min(1).max(200), event: z.string().min(1).max(100), payment: z.object({ id: z.string().regex(/^pay_[a-zA-Z0-9]+$/) }).passthrough().optional(), subscription: z.object({ id: z.string().regex(/^sub_[a-zA-Z0-9]+$/) }).passthrough().optional() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: corsHeaders });
  try {
    const status = webhookGate(await getSecret('ASAAS_WEBHOOK_TOKEN'), req.headers.get('asaas-access-token'));
    if (status !== 200) return json({ error: status === 401 ? 'unauthorized' : 'service_unavailable' }, status);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: 'invalid_event' }, 400);
    const event = parsed.data;
    const { admin, environment, request } = await asaasContext();
    if (event.event === 'SUBSCRIPTION_DELETED' && event.subscription) {
      const { data: contract, error } = await admin.from('asaas_contracts').select('subscription_id').eq('remote_subscription_id', event.subscription.id).eq('environment', environment).maybeSingle();
      if (error) return json({ error: 'retry' }, 503);
      if (!contract) return json({ ignored: true });
      const remote = await request(`/subscriptions/${encodeURIComponent(event.subscription.id)}`);
      if (remote.deleted !== true && remote.status !== 'INACTIVE') return json({ error: 'unconfirmed_cancellation' }, 409);
      const { error: updateError } = await admin.from('billing_subscriptions').update({ status: 'canceled' }).eq('id', contract.subscription_id);
      return updateError ? json({ error: 'retry' }, 503) : json({ success: true });
    }
    if (!event.event.startsWith('PAYMENT_') || !event.payment) return json({ ignored: true });
    const payment = await request(`/payments/${encodeURIComponent(event.payment.id)}`);
    if (!payment.subscription) return json({ ignored: true });
    const { data: contract, error } = await admin.from('asaas_contracts').select('id,subscription_id,remote_subscription_id').eq('remote_subscription_id', payment.subscription).eq('environment', environment).maybeSingle();
    if (error) return json({ error: 'retry' }, 503);
    if (!contract) {
      // Creation may still be committing its remote ID; keep its events retryable.
      const remote = await request(`/subscriptions/${encodeURIComponent(payment.subscription)}`);
      if (remote.externalReference && /^[0-9a-f-]{36}$/i.test(remote.externalReference)) {
        const { data: pending } = await admin.from('asaas_contracts').select('id').eq('id', remote.externalReference).eq('environment', environment).maybeSingle();
        if (pending) return json({ error: 'contract_pending' }, 503);
      }
      return json({ ignored: true });
    }
    const state = paymentState(payment.deleted ? 'DELETED' : payment.status);
    if (!state || !/^\d{4}-\d{2}-\d{2}$/.test(payment.dueDate) || !Number.isFinite(payment.value)) return json({ error: 'unsupported_payment' }, 422);
    const { error: applyError } = await admin.rpc('apply_asaas_payment', {
      _contract: contract.id, _event: event.id, _payment: payment.id, _state: state,
      _due: payment.dueDate, _amount: Math.round(payment.value * 100),
      _paid_at: state === 'paid' ? `${payment.paymentDate ?? payment.confirmedDate ?? payment.dueDate}T12:00:00-03:00` : null,
    });
    if (applyError) return json({ error: 'payment_requires_review' }, 503);
    return json({ success: true });
  } catch {
    // Never log provider headers, credentials, or payloads.
    return json({ error: 'service_unavailable' }, 503);
  }
});