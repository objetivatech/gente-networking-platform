/**
 * get-contract-url — Gera signed URL curta para o PDF assinado de um lead.
 * Admin-only.
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
    const { data: claimsData } = await userClient.auth.getClaims(token);
    if (!claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    const { data: role } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!role) return json({ error: 'Apenas admins' }, 403);

    const body = await req.json().catch(() => ({}));
    const leadId = body?.lead_id as string | undefined;
    if (!leadId) return json({ error: 'lead_id obrigatório' }, 400);

    const { data: lead } = await admin
      .from('crm_leads')
      .select('contract_signed_pdf_path')
      .eq('id', leadId)
      .single();
    if (!lead?.contract_signed_pdf_path) {
      return json({ error: 'PDF ainda não disponível' }, 404);
    }

    const { data: signed, error } = await admin.storage
      .from('contracts')
      .createSignedUrl(lead.contract_signed_pdf_path, 300);
    if (error || !signed) return json({ error: error?.message ?? 'Falha ao gerar URL' }, 500);

    return json({ url: signed.signedUrl, expires_in: 300 });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erro' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
