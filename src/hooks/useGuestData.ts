import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveGuestVisibility } from '@/lib/identity-utils';
import { useGuestAgenda } from '@/hooks/useGuestAgenda';

export interface GuestInvitationData {
  invitation: {
    id: string;
    code: string;
    invited_by: string;
    created_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any;
  } | null;
  inviter: {
    id: string;
    full_name: string;
    company: string | null;
    avatar_url: string | null;
  } | null;
  inviterTeams: {
    id: string;
    name: string;
    color: string;
  }[];
  allowedTeamIds: string[];
  eventIds: string[];

}

export interface GuestMeeting {
  id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  team?: { name: string; color: string } | null;
  attendees_count?: number;
  is_attending?: boolean;
}

export function useGuestData() {
  const { user } = useAuth();

  const { data: guestData, isLoading: isLoadingGuestData } = useQuery({
    queryKey: ['guest-invitation-data', user?.id],
    queryFn: async (): Promise<GuestInvitationData> => {
      const empty: GuestInvitationData = {
        invitation: null, inviter: null, inviterTeams: [], allowedTeamIds: [], eventIds: [],
      };
      if (!user?.id) return empty;

      const { data: participations, error: participationError } = await supabase
        .from('guest_participations')
        .select('team_id, meeting_id, invited_by, invitation_id, created_at')
        .eq('profile_id', user.id)
        .in('status', ['invited', 'confirmed', 'attended'])
        .order('created_at', { ascending: true });

      if (participationError) throw participationError;

      // Pode existir mais de um convite aceito (histórico). Lê todos, sem quebrar.
      const { data: invitations, error: invError } = await supabase
        .from('invitations')
        .select('id, code, invited_by, created_at, accepted_at, metadata, team_id, event_id')
        .eq('accepted_by', user.id)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: true });

      if (invError) return empty;

      const participationTeams = new Set(
        (participations ?? []).map((item) => item.team_id).filter(Boolean) as string[],
      );
      const participationEvents = new Set(
        (participations ?? []).map((item) => item.meeting_id).filter(Boolean) as string[],
      );

      if ((!invitations || invitations.length === 0) && (participations?.length ?? 0) === 0) return empty;

      const visibility = resolveGuestVisibility(invitations ?? []);
      const primary = visibility.primary ?? invitations?.[0] ?? null;
      const allowedSet = new Set<string>([...visibility.allowedTeamIds, ...participationTeams]);
      const eventIds = Array.from(new Set([...visibility.eventIds, ...participationEvents]));
      const primaryInviterId = primary?.invited_by ?? participations?.[0]?.invited_by ?? null;

      // Fallback: grupos atuais de quem convidou
      if (allowedSet.size === 0 && visibility.inviterIds.length > 0) {
        const { data: teamMemberships } = await supabase
          .from('team_members')
          .select('team_id')
          .in('user_id', visibility.inviterIds);
        teamMemberships?.forEach((tm) => tm.team_id && allowedSet.add(tm.team_id));
      }

      const allowedTeamIds = Array.from(allowedSet);

      // Fetch inviter profile (do convite principal)
      const { data: inviter } = primaryInviterId
        ? await supabase
          .from('profiles')
          .select('id, full_name, company, avatar_url')
          .eq('id', primaryInviterId)
          .maybeSingle()
        : { data: null };

      let inviterTeams: { id: string; name: string; color: string }[] = [];
      if (allowedTeamIds.length > 0) {
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name, color')
          .in('id', allowedTeamIds);
        inviterTeams = teams || [];
      }

      return { invitation: primary, inviter, inviterTeams, allowedTeamIds, eventIds };
    },
    enabled: !!user?.id,
  });

  const agenda = useGuestAgenda();
  return {
    guestData,
    guestMeetings: agenda.data,
    isLoading: isLoadingGuestData || agenda.isLoading,
    confirmAttendance: agenda.confirmation,
    cancelAttendance: agenda.confirmation,
  };
}
