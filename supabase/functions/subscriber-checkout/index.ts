/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { asaasContext, safeAsaasPaymentUrl } from '../_shared/asaas.ts';
import { paymentState } from '../_shared/asaas-webhook-rules.ts';
import { effectiveAsaasStatus } from '../_shared/asaas-public-rules.ts';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('plans') }),
  z.object({ action: z.literal('start'), plan_id: z.string().uuid(), cpf_cnpj: z.string().regex(/^\d{11}$|^\d{14}$/), consent: z.literal(true) }),
  z.object({ action: z.literal('status') }),
  z.object({ action: z.literal('cancel'), contract_id: z.string().uuid() }),
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: 'Confira os dados informados' }, 400);
    const input = parsed.data;
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !serviceKey || !anon) return json({ error: 'Serviço indisponível' }, 503);
    if (input.action === 'plans') {
      const admin = createClient(url, serviceKey);
      const { data, error } = await admin.rpc('get_self_service_plans');
      if (error) return json({ error: 'Não foi possível consultar os planos' }, 503);
      return json({ plans: data });
    }
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Entre na sua conta para continuar' }, 401);
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userError } = await client.auth.getUser(auth.slice(7));
    const user = userData.user;
    if (userError || !user || !user.email_confirmed_at) return json({ error: 'Entre com uma conta confirmada' }, 401);
    const ctx = await asaasContext();
    const { admin, environment, request } = ctx;
    const { data: profile } = await admin.from('profiles').select('id,full_name,email,phone,is_active').eq('id', user.id).single();
    if (!profile?.is_active) return json({ error: 'Solicite a reativação à administração' }, 403);

    if (input.action === 'status') {
      const { data: contracts, error } = await admin.from('asaas_contracts').select('id,subscription_id,environment,remote_subscription_id,payment_url,paid_until,billing_subscriptions(status,amount_cents,billing_plans(name))').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1);
      if (error) return json({ error: 'Não foi possível consultar sua assinatura' }, 503);
      const contract = contracts?.[0];
      if (!contract) return json({ contract: null });
      // Read-back from the provider repairs a missed webhook, never trusting browser callbacks.
      if (contract.remote_subscription_id && contract.environment === environment) {
        const payments = await request(`/subscriptions/${encodeURIComponent(contract.remote_subscription_id)}/payments?limit=100`);
        for (const payment of payments.data ?? []) {
          if (payment.subscription !== contract.remote_subscription_id) continue;
          const state = paymentState(payment.status);
          if (!state) continue;
          const { error: applyError } = await admin.rpc('apply_asaas_payment', {
            _contract: contract.id, _event: `reconcile:${payment.id}:${payment.status}`, _payment: payment.id,
            _state: state, _due: payment.dueDate, _amount: Math.round(payment.value * 100),
            _paid_at: state === 'paid' ? `${payment.paymentDate ?? payment.confirmedDate ?? payment.dueDate}T12:00:00-03:00` : null,
          });
          if (applyError) return json({ error: 'Pagamento requer conferência administrativa' }, 409);
        }
      }
      const { data: sub } = await admin.from('billing_subscriptions').select('status,amount_cents,billing_plans(name)').eq('id', contract.subscription_id).single();
      const { data: updated } = await admin.from('asaas_contracts').select('paid_until').eq('id', contract.id).single();
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      return json({ contract: { id: contract.id, status: effectiveAsaasStatus(sub?.status ?? 'draft', updated?.paid_until ?? null, today), plan: sub?.billing_plans, payment_url: safeAsaasPaymentUrl(contract.payment_url, contract.environment), amount_cents: sub?.amount_cents } });
    }

    if (input.action === 'cancel') {
      const { data: contract } = await admin.from('asaas_contracts').select('*').eq('id', input.contract_id).eq('profile_id', user.id).single();
      if (!contract || contract.environment !== environment) return json({ error: 'Assinatura não encontrada neste ambiente' }, 404);
      if (contract.remote_subscription_id) await request(`/subscriptions/${encodeURIComponent(contract.remote_subscription_id)}`, undefined, 'DELETE');
      const { error } = await admin.from('billing_subscriptions').update({ status: 'canceled' }).eq('id', contract.subscription_id).eq('profile_id', user.id);
      if (error) return json({ error: 'Cancelamento requer conferência administrativa' }, 503);
      return json({ success: true });
    }

    const { data: contract, error: reserveError } = await admin.rpc('reserve_asaas_contract', { _profile: user.id, _plan: input.plan_id, _environment: environment });
    if (reserveError || !contract) return json({ error: reserveError?.message ?? 'Não foi possível iniciar a contratação' }, 409);
    try {
      let customerId = contract.customer_id;
      if (!customerId) {
        const customers = await request(`/customers?externalReference=${encodeURIComponent(contract.id)}&limit=2`);
        const customer = customers.data?.[0] ?? await request('/customers', { name: profile.full_name, email: profile.email, mobilePhone: profile.phone?.replace(/\D/g, ''), cpfCnpj: input.cpf_cnpj, externalReference: contract.id });
        customerId = customer.id;
        const { error } = await admin.from('asaas_contracts').update({ customer_id: customerId }).eq('id', contract.id);
        if (error) throw new Error('Não foi possível salvar o vínculo financeiro');
      }
      let remoteId = contract.remote_subscription_id;
      if (!remoteId) {
        const existing = await request(`/subscriptions?externalReference=${encodeURIComponent(contract.id)}&limit=2`);
        if ((existing.data?.length ?? 0) > 1) throw new Error('Contratação requer conferência administrativa');
        remoteId = existing.data?.[0]?.id;
        if (!remoteId) {
          if (contract.creation_started_at) throw new Error('Solicitação anterior requer conferência administrativa antes de tentar novamente');
          const { error } = await admin.from('asaas_contracts').update({ creation_started_at: new Date().toISOString() }).eq('id', contract.id);
          if (error) throw new Error('Não foi possível reservar a emissão');
          const remote = await request('/subscriptions', { customer: customerId, billingType: 'UNDEFINED', value: contract.amount_cents / 100, nextDueDate: contract.start_date, cycle: 'MONTHLY', description: `Gente Networking — ${contract.plan_name}`, externalReference: contract.id, callback: { successUrl: 'https://comunidade.gentenetworking.com.br/assinar?retorno=1', autoRedirect: true } });
          remoteId = remote.id;
        }
        if (!remoteId) throw new Error('Não foi possível identificar a assinatura no Asaas');
        const { error } = await admin.from('asaas_contracts').update({ remote_subscription_id: remoteId }).eq('id', contract.id);
        if (error) throw new Error('Vínculo financeiro requer conferência administrativa');
      }
      const payments = await request(`/subscriptions/${encodeURIComponent(remoteId)}/payments?limit=100`);
      const payment = (payments.data ?? []).filter((p: { subscription: string; status: string }) => p.subscription === remoteId && !['RECEIVED', 'CONFIRMED', 'REFUNDED', 'DELETED'].includes(p.status)).sort((a: { dueDate: string }, b: { dueDate: string }) => a.dueDate.localeCompare(b.dueDate))[0];
      const paymentUrl = safeAsaasPaymentUrl(payment?.invoiceUrl, environment);
      if (!paymentUrl) throw new Error('A cobrança ainda está sendo preparada. Tente novamente em instantes.');
      const { error } = await admin.from('asaas_contracts').update({ payment_url: paymentUrl, lease_until: null }).eq('id', contract.id);
      if (error) throw new Error('Não foi possível salvar a cobrança');
      return json({ payment_url: paymentUrl });
    } finally {
      await admin.from('asaas_contracts').update({ lease_until: null }).eq('id', contract.id);
    }
  } catch (error) {
    // Only application-authored messages; provider bodies and tokens are never returned.
    return json({ error: 'Não foi possível concluir o pagamento. Tente novamente ou solicite conferência à administração.' }, 503);
  }
});