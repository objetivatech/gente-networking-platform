/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { claimedDispatch } from './lp-claim.ts';
import { sendEmail } from './email-provider.ts';
import { lpNewLeadEmailTemplate } from './email-templates.ts';

export async function notifyPublicProfileHost(db: SupabaseClient, invitationId: string) {
  return claimedDispatch(db, 'public_profile_host_notice', invitationId, async () => {
    const { data: invite, error } = await db.from('invitations').select('invited_by, name, email, metadata').eq('id', invitationId).single();
    if (error || invite.metadata?.source_detail !== 'perfil_publico_membro') return false;
    const { data: host } = await db.from('profiles').select('email, is_active, email_notifications_enabled').eq('id', invite.invited_by).single();
    if (!host?.is_active || host.email_notifications_enabled === false || !host.email) return true;
    const result = await sendEmail({ to: host.email, subject: 'Uma pessoa quer conhecer seu Grupo',
      html: lpNewLeadEmailTemplate(invite.name ?? 'Visitante', invite.email ?? '', 'Seu perfil público — acompanhe em Convites'),
      context: 'public_profile_host_notice', referenceId: invitationId });
    return result.ok;
  });
}