/**
 * useGuestsDirectory - Diretório consolidado de convidados da comunidade
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Agrega: profiles + user_roles + invitations + team_members + attendances
 * para alimentar a página /convidados (acessível a todos os membros autenticados).
 */

import { useQuery } from '@tanstack/react-query';
import { supabaseReadOnly } from '@/integrations/supabase/client';

export type GuestJourneyStatus = 'awaiting_first' | 'attended' | 'promoted';

export interface GuestDirectoryEntry {
  id: string;
  full_name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  business_segment: string | null;
  current_role: 'admin' | 'facilitador' | 'membro' | 'convidado' | null;
  status: GuestJourneyStatus;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  invited_by_id: string | null;
  invited_by_name: string | null;
  invited_at: string | null;
  attendance_count: number;
}

export function useGuestsDirectory() {
  return useQuery({
    queryKey: ['guests-directory'],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<GuestDirectoryEntry[]> => {
      // 1) Convites aceitos => candidatos ao diretório
      const { data: invitations } = await supabaseReadOnly
        .from('invitations')
        .select('accepted_by, invited_by, accepted_at, team_id, created_at')
        .eq('status', 'accepted');

      const guestUserIds = Array.from(
        new Set((invitations || []).map(i => i.accepted_by).filter(Boolean) as string[])
      );

      if (!guestUserIds.length) return [];

      // 2) Roles atuais
      const { data: rolesData } = await supabaseReadOnly
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', guestUserIds);

      const rolesMap = new Map<string, GuestDirectoryEntry['current_role']>();
      rolesData?.forEach(r => rolesMap.set(r.user_id, r.role as any));

      // 3) Profiles (apenas ativos)
      const { data: profiles } = await supabaseReadOnly
        .from('profiles')
        .select('id, full_name, email, phone, company, avatar_url, business_segment, is_active')
        .in('id', guestUserIds)
        .eq('is_active', true);

      // 4) team_members + teams
      const { data: tms } = await supabaseReadOnly
        .from('team_members')
        .select('user_id, team_id')
        .in('user_id', guestUserIds);

      const teamIds = Array.from(new Set((tms || []).map(t => t.team_id)));
      const { data: teams } = teamIds.length
        ? await supabaseReadOnly.from('teams').select('id, name, color').in('id', teamIds)
        : { data: [] as any[] };
      const teamsMap = new Map<string, { name: string; color: string | null }>();
      teams?.forEach(t => teamsMap.set(t.id, { name: t.name, color: t.color }));

      const userTeamMap = new Map<string, { team_id: string; team_name: string; team_color: string | null }>();
      tms?.forEach(t => {
        const team = teamsMap.get(t.team_id);
        if (team && !userTeamMap.has(t.user_id)) {
          userTeamMap.set(t.user_id, { team_id: t.team_id, team_name: team.name, team_color: team.color });
        }
      });

      // 5) Inviter names
      const inviterIds = Array.from(
        new Set((invitations || []).map(i => i.invited_by).filter(Boolean) as string[])
      );
      const { data: inviters } = inviterIds.length
        ? await supabaseReadOnly.from('profiles').select('id, full_name').in('id', inviterIds)
        : { data: [] as any[] };
      const inviterMap = new Map<string, string>();
      inviters?.forEach(p => inviterMap.set(p.id, p.full_name));

      // 6) Attendance counts
      const { data: attendances } = await supabaseReadOnly
        .from('attendances')
        .select('user_id')
        .in('user_id', guestUserIds);
      const attendanceCount = new Map<string, number>();
      attendances?.forEach(a => {
        attendanceCount.set(a.user_id, (attendanceCount.get(a.user_id) || 0) + 1);
      });

      // Última invitation por user (mais recente)
      const lastInvByUser = new Map<string, typeof invitations[0]>();
      invitations?.forEach(inv => {
        if (!inv.accepted_by) return;
        const prev = lastInvByUser.get(inv.accepted_by);
        if (!prev || (inv.accepted_at && (!prev.accepted_at || inv.accepted_at > prev.accepted_at))) {
          lastInvByUser.set(inv.accepted_by, inv);
        }
      });

      const entries: GuestDirectoryEntry[] = [];

      (profiles || []).forEach(p => {
        const role = rolesMap.get(p.id) ?? null;
        const inv = lastInvByUser.get(p.id);
        const team = userTeamMap.get(p.id);
        const count = attendanceCount.get(p.id) || 0;

        let status: GuestJourneyStatus;
        if (role && role !== 'convidado') {
          status = 'promoted';
        } else if (count > 0) {
          status = 'attended';
        } else {
          status = 'awaiting_first';
        }

        entries.push({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          company: p.company,
          avatar_url: p.avatar_url,
          business_segment: p.business_segment,
          current_role: role,
          status,
          team_id: team?.team_id ?? null,
          team_name: team?.team_name ?? null,
          team_color: team?.team_color ?? null,
          invited_by_id: inv?.invited_by ?? null,
          invited_by_name: inv?.invited_by ? inviterMap.get(inv.invited_by) ?? null : null,
          invited_at: inv?.created_at ?? null,
          attendance_count: count,
        });
      });

      return entries.sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });
}
