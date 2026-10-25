/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email-provider.ts';
import { meetingRequestEmailTemplate, meetingResponseEmailTemplate } from '../_shared/email-templates.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
const appUrl = 'https://comunidade.gentenetworking.com.br';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const auth = req.headers.get('Authorization');
    if (!url || !anon || !service || !auth) return json({ error: 'Não autenticado' }, 401);
    const viewer = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await viewer.auth.getUser();
    if (authError || !user) return json({ error: 'Não autenticado' }, 401);
    const db = createClient(url, service);
    const { kind, reference_id: referenceId } = await req.json();
    let to = '', subject = '', html = '';
    if (kind === 'plan') {
      const { data: role } = await db.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!role) return json({ error: 'Apenas Admin' }, 403);
      const { data: sub } = await db.from('billing_subscriptions').select('profile_id,plan_id,status').eq('id', referenceId).maybeSingle();
      if (!sub?.profile_id || sub.status !== 'active') return json({ error: 'Assinatura indisponível' }, 409);
      const [{ data: profile }, { data: plan }] = await Promise.all([
        db.from('profiles').select('full_name,email,is_active').eq('id', sub.profile_id).maybeSingle(),
        db.from('billing_plans').select('name,active').eq('id', sub.plan_id).maybeSingle(),
      ]);
      if (!profile?.is_active || !plan?.active) return json({ error: 'Acesso indisponível' }, 409);
      to = profile.email ?? ''; subject = 'Seu plano na Comunidade Gente foi atualizado';
      html = `<h1>Gente Networking</h1><p>Olá, ${escape(profile.full_name)}!</p><p>Seu plano ${escape(plan.name)} foi vinculado ao seu cadastro. Seus acessos seguem os recursos desse plano.</p><p><a href="${appUrl}">Acessar a Comunidade Gente</a></p>`;
    } else if (kind === 'premium') {
      const { data: participation } = await db.from('guest_participations').select('*').eq('id', referenceId).maybeSingle();
      if (!participation?.profile_id || participation.invited_by !== user.id) return json({ error: 'Sem permissão' }, 403);
      const [{ data: profile }, { data: meeting }] = await Promise.all([
        db.from('profiles').select('full_name,email').eq('id', participation.profile_id).maybeSingle(),
        db.from('meetings').select('title,meeting_date,meeting_time,location').eq('id', participation.meeting_id).maybeSingle(),
      ]);
      if (!profile || !meeting) return json({ error: 'Convite indisponível' }, 409);
      to = profile.email ?? ''; subject = 'Convite para um Encontro Premium — Gente Networking';
      html = `<h1>Gente Networking</h1><p>Olá, ${escape(profile.full_name)}!</p><p>Você foi convidado para ${escape(meeting.title)} em ${escape(meeting.meeting_date)} ${escape(meeting.meeting_time ?? '')}.</p><p>${escape(meeting.location ?? '')}</p><p><a href="${appUrl}">Responder ao convite</a></p>`;
    } else if (kind === 'request' || kind === 'response') {
      const { data: meeting } = await db.from('meeting_requests').select('*').eq('id', referenceId).maybeSingle();
      if (!meeting || (kind === 'request' ? meeting.requester_id !== user.id : meeting.recipient_id !== user.id)) return json({ error: 'Sem permissão' }, 403);
      const { data: profiles } = await db.from('profiles').select('id,full_name,email').in('id', [meeting.requester_id, meeting.recipient_id]);
      const requester = profiles?.find(p => p.id === meeting.requester_id);
      const recipient = profiles?.find(p => p.id === meeting.recipient_id);
      if (!requester || !recipient) return json({ error: 'Contato indisponível' }, 409);
      if (kind === 'request') {
        to = recipient.email ?? ''; subject = 'Nova solicitação de Gente em Ação';
        html = meetingRequestEmailTemplate(recipient.full_name, requester.full_name, meeting.proposed_start, meeting.duration_minutes, meeting.location ?? '', meeting.message ?? '', `${appUrl}/perfil?tab=agendamentos`);
      } else {
        if (!['confirmed', 'declined'].includes(meeting.status)) return json({ error: 'Resposta indisponível' }, 409);
        to = requester.email ?? ''; subject = meeting.status === 'confirmed' ? 'Gente em Ação confirmado' : 'Gente em Ação recusado';
        html = meetingResponseEmailTemplate(requester.full_name, recipient.full_name, meeting.status, meeting.proposed_start, meeting.duration_minutes, meeting.location ?? '', `${appUrl}/perfil?tab=agendamentos`);
      }
    } else return json({ error: 'Mensagem inválida' }, 400);
    if (!to) return json({ error: 'Contato sem e-mail' }, 409);
    const context = `community_${kind}`;
    const { data: previous } = await db.from('notification_dispatch_log').select('id').eq('context', context).eq('reference_id', referenceId).eq('status', 'sent').limit(1);
    if (previous?.length) return json({ success: true, already_sent: true });
    const result = await sendEmail({ to, subject, html, context, referenceId, bypassRateLimit: false });
    return json({ success: result.ok, error: result.error }, result.ok ? 200 : 502);
  } catch { return json({ error: 'Não foi possível enviar a mensagem' }, 500); }
});