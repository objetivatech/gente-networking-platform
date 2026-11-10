/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sendEmail } from './email-provider.ts';
import { guestActivationEmailTemplate, lpNewLeadEmailTemplate } from './email-templates.ts';
import { getSecret } from './secrets.ts';
import { ONBOARDING_SUBJECTS, type OnboardingCategory } from './guest-onboarding.ts';
import { claimedDispatch } from './lp-claim.ts';
export async function dispatchLpIntake(db: SupabaseClient, input: {
  leadId: string; invitationId?: string | null; inviteUrl: string; category: OnboardingCategory;
  name: string; email: string; phone?: string | null; company?: string | null;
  pageSlug: string; teamId?: string | null; activationNeeded: boolean;
}) {
  const activation = input.activationNeeded && input.invitationId ? await claimedDispatch(db, 'lp_activation', input.invitationId, async () => {
    const result = await sendEmail({ to: input.email, subject: ONBOARDING_SUBJECTS[input.category],
      html: guestActivationEmailTemplate(input.name, input.inviteUrl, input.category), context: `guest_activation_${input.category}`, referenceId: input.leadId, bypassRateLimit: true });
    await db.from('crm_leads').update({ onboarding_email_status: result.ok ? 'sent' : 'error', onboarding_status: result.ok ? 'aguardando_ativacao' : 'cadastro_recebido', onboarding_email_sent_at: result.ok ? new Date().toISOString() : null }).eq('id', input.leadId);
    return result.ok;
  }) : 'not_required';
  const notice = await claimedDispatch(db, 'lp_admin_notice', input.leadId, async () => {
    const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin');
    const ids = (admins ?? []).map(row => row.user_id);
    if (!ids.length) return false;
    const { data: recipients } = await db.from('profiles').select('email').in('id', ids).eq('is_active', true).eq('email_notifications_enabled', true);
    const addresses = [...new Set((recipients ?? []).map(row => row.email).filter((email): email is string => typeof email === 'string' && !!email))];
    let allSent = true;
    for (const to of addresses) {
      // Each recipient gets its own audit; retry skips already delivered notices.
      const { count } = await db.from('notification_dispatch_log').select('id', { count: 'exact', head: true }).eq('context', 'lp_new_lead').eq('reference_id', input.leadId).eq('recipient', to).eq('status', 'sent');
      if (count) continue;
      const result = await sendEmail({ to, subject: `Novo inscrito — ${input.pageSlug}`, html: lpNewLeadEmailTemplate(input.name, input.email, input.pageSlug), context: 'lp_new_lead', referenceId: input.leadId });
      allSent = result.ok && allSent;
    }
    return allSent;
  });
  const rd = await claimedDispatch(db, 'lp_rd_conversion', input.leadId, async () => {
    const apiKey = await getSecret('RD_STATION_API_KEY');
    let status = 'error'; let error: string | null = 'RD_STATION_API_KEY não configurado';
    if (apiKey) {
      try {
        const response = await fetch(`https://api.rd.services/platform/conversions?api_key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000), body: JSON.stringify({ event_type: 'CONVERSION', event_family: 'CDP', payload: { conversion_identifier: `lp_${input.pageSlug}`, email: input.email, name: input.name, ...(input.phone ? { mobile_phone: input.phone } : {}), ...(input.company ? { company_name: input.company } : {}), tags: ['LP Gente', input.pageSlug] } }) });
        status = response.ok ? 'sent' : 'error'; error = response.ok ? null : `RD Station HTTP ${response.status}`;
      } catch { error = 'RD Station indisponível ou tempo limite excedido'; }
    }
    await db.from('notification_dispatch_log').insert({ channel: 'rd_station', provider: 'rd_station', recipient: input.email, context: 'lp_conversion', reference_id: input.leadId, status, error });
    return status === 'sent';
  });
  return { activation, admin_notice: notice, rd_station: rd };
}