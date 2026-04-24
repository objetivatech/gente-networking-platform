/**
 * @hook useTeamGuests
 * @description Lista convidados ATIVOS associados a um grupo via convite aceito.
 *
 * Convidados não pertencem a team_members (v3.7.0). O vínculo com um grupo
 * existe exclusivamente no convite aceito (`invitations.team_id`).
 *
 * Considera convidado ativo: invitations.status='accepted', team_id=<teamId>,
 * accepted_by != null, e o usuário ainda possui role='convidado' (não foi promovido).
 */
import { useQuery } from '@tanstack/react-query';
import { supabaseReadOnly } from '@/integrations/supabase/client';

export interface TeamGuest {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  slug: string | null;
  invitation_id: string;
  accepted_at: string | null;
  invited_by_id: string | null;
  invited_by_name: string | null;
}

export function useTeamGuests(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['team-guests', teamId],
    enabled: !!teamId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TeamGuest[]> => {
      if (!teamId) return [];

      const { data: invitations } = await supabaseReadOnly
        .from('invitations')
        .select('id, accepted_by, accepted_at, invited_by')
        .eq('status', 'accepted')
        .eq('team_id', teamId)
        .not('accepted_by', 'is', null);

      if (!invitations?.length) return [];

      const userIds = Array.from(new Set(invitations.map(i => i.accepted_by!).filter(Boolean)));
      if (!userIds.length) return [];

      // Filtrar apenas usuários que AINDA são convidados (role atual = 'convidado')
      const { data: roles } = await supabaseReadOnly
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const activeGuestIds = new Set(
        (roles || []).filter(r => r.role === 'convidado').map(r => r.user_id)
      );
      const promotedIds = new Set(
        (roles || []).filter(r => r.role !== 'convidado').map(r => r.user_id)
      );
      const guestIds = userIds.filter(uid => activeGuestIds.has(uid) && !promotedIds.has(uid));
      if (!guestIds.length) return [];

      const { data: profiles } = await supabaseReadOnly
        .from('profiles')
        .select('id, full_name, email, phone, company, avatar_url, slug, is_active')
        .in('id', guestIds)
        .eq('is_active', true);

      const profMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const inviterIds = Array.from(new Set(invitations.map(i => i.invited_by).filter(Boolean) as string[]));
      const { data: inviters } = inviterIds.length
        ? await supabaseReadOnly.from('profiles').select('id, full_name').in('id', inviterIds)
        : { data: [] as { id: string; full_name: string }[] };
      const inviterMap = new Map<string, string>();
      (inviters || []).forEach((p: any) => inviterMap.set(p.id, p.full_name));

      return invitations
        .filter(i => i.accepted_by && profMap.has(i.accepted_by))
        .map(i => {
          const p = profMap.get(i.accepted_by!)!;
          return {
            user_id: i.accepted_by!,
            full_name: p.full_name || 'Convidado',
            email: p.email ?? null,
            phone: p.phone ?? null,
            company: p.company ?? null,
            avatar_url: p.avatar_url ?? null,
            slug: p.slug ?? null,
            invitation_id: i.id,
            accepted_at: i.accepted_at,
            invited_by_id: i.invited_by ?? null,
            invited_by_name: i.invited_by ? inviterMap.get(i.invited_by) ?? null : null,
          };
        });
    },
  });
}
