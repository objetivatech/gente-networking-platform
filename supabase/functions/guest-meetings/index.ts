/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { GuestMeetingRequest } from '../_shared/guest-meeting-rules.ts';
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
    const { data: { user }, error: authError } = await viewer.auth.getUser();
    if (authError || !user) return json({ error: 'Não autenticado' }, 401);
    const parsed = GuestMeetingRequest.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: 'Confira os dados informados' }, 400);
    const db = createClient(url, service);
    const { action, ...payload } = parsed.data;
    const { data, error } = await db.rpc('guest_meetings_dispatch', { _caller: user.id, _action: action, _payload: payload });
    if (error) return json({ error: error.message }, 403);
    if (action !== 'invite') return json(data);
    if (!data?.success) return json({ error: data?.message ?? 'Não foi possível convidar' }, 409);
    // Delivery is independent from persistence; retrying reuses the same durable reference.
    const reference = data.participation_id ?? data.invitation_id;
    let emailSent = false;
    if (reference) {
      const { data: delivery, error: deliveryError } = await viewer.functions.invoke('community-notification', {
        body: { kind: data.participation_id ? 'premium' : 'meeting_invitation', reference_id: reference },
      });
      emailSent = !deliveryError && Boolean(delivery?.success);
    }
    return json({ ...data, email_sent: emailSent });
  } catch { return json({ error: 'Não foi possível concluir a operação' }, 500); }
});