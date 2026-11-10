/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSecret } from './secrets.ts';
export { safeAsaasPaymentUrl } from './asaas-public-rules.ts';

export async function asaasContext() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Serviço indisponível');
  const admin = createClient(url, key);
  const { data: setting, error } = await admin.from('integration_settings').select('provider,environment').eq('category', 'payments').single();
  if (error || setting?.provider !== 'asaas' || !['production', 'sandbox'].includes(setting.environment)) throw new Error('Configure o Asaas e o ambiente de pagamentos');
  const apiKey = await getSecret('ASAAS_API_KEY');
  if (!apiKey || !await getSecret('ASAAS_WEBHOOK_TOKEN')) throw new Error('Configuração de pagamentos incompleta');
  const base = setting.environment === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
  async function request(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
    const response = await fetch(`${base}${path}`, {
      method, headers: { access_token: apiKey, 'Content-Type': 'application/json', 'User-Agent': 'GenteNetworking/3.60' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error('O Asaas não concluiu a solicitação. Revise os dados ou contate a administração.');
    return await response.json();
  }
  return { admin, environment: setting.environment as 'production' | 'sandbox', request };
}
