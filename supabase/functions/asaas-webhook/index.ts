/**
 * Asaas webhook — fail-closed provisioning endpoint; financial processing is not enabled yet.
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * @copyright © 2026 Ranktop SEO Inteligente.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getSecret } from '../_shared/secrets.ts';
import { webhookGate } from '../_shared/asaas-webhook-rules.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: corsHeaders });
  let status = 503;
  try {
    status = webhookGate(await getSecret('ASAAS_WEBHOOK_TOKEN'), req.headers.get('asaas-access-token'));
  } catch {
    // Never log provider headers, credentials, or payloads.
  }
  return new Response(JSON.stringify({
    error: status === 401 ? 'unauthorized' : 'payment_processing_not_enabled',
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(status === 503 ? { 'Retry-After': '300' } : {}) },
  });
});