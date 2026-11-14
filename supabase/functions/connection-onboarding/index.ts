/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('configure'), enabled: z.boolean(), title: z.string().trim().min(1).max(200), url: z.string().max(2048).refine(v => !v || /^https:\/\/\S+$/.test(v)), duration: z.number().int().min(1).max(7200) }),
  z.object({ action: z.literal('progress'), version: z.string().uuid(), seconds: z.number().int().min(0).max(30) }),
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization');
    if (!url || !anon || !service || !authorization) return json({ error: 'Não autenticado' }, 401);
    const viewer = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error } = await viewer.auth.getUser();
    if (error || !user) return json({ error: 'Não autenticado' }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: 'Confira os dados do vídeo' }, 400);
    const { action, ...payload } = parsed.data;
    const db = createClient(url, service);
    const { data, error: failure } = await db.rpc('connection_onboarding_dispatch', { _caller: user.id, _action: action, _payload: payload });
    return failure ? json({ error: failure.message }, 403) : json(data);
  } catch { return json({ error: 'Não foi possível salvar' }, 500); }
});