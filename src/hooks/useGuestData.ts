import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isFuture, isToday } from 'date-fns';
import { parseLocalDate } from '@/lib/date-utils';
import { resolveGuestVisibility } from '@/lib/identity-utils';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guestData, isLoading: isLoadingGuestData } = useQuery({
    queryKey: ['guest-invitation-data', user?.id],
    queryFn: async (): Promise<GuestInvitationData> => {
      const empty: GuestInvitationData = {
        invitation: null, inviter: null, inviterTeams: [], allowedTeamIds: [], eventIds: [],
      };
      if (!user?.id) return empty;

      // Pode existir mais de um convite aceito (histórico). Lê todos, sem quebrar.
      const { data: invitations, error: invError } = await supabase
        .from('invitations')
        .select('id, code, invited_by, created_at, accepted_at, metadata, team_id, event_id')
        .eq('accepted_by', user.id)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: true });

      if (invError || !invitations || invitations.length === 0) return empty;

      const visibility = resolveGuestVisibility(invitations);
      const primary = visibility.primary ?? invitations[0];
      const allowedSet = new Set<string>(visibility.allowedTeamIds);
      const eventIds = visibility.eventIds;

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
      const { data: inviter } = await supabase
        .from('profiles')
        .select('id, full_name, company, avatar_url')
        .eq('id', primary.invited_by)
        .maybeSingle();

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

  const { data: guestMeetings, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['guest-meetings', guestData?.allowedTeamIds?.join(','), guestData?.eventIds?.join(',')],
    queryFn: async (): Promise<GuestMeeting[]> => {
      const teamIds = guestData?.allowedTeamIds || [];
      const eventIds = guestData?.eventIds || [];

      const collected = new Map<string, any>();

      if (teamIds.length > 0) {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .in('team_id', teamIds);
        if (error) throw error;
        data?.forEach((m) => collected.set(m.id, m));
      }

      // Convites HUB (sem grupo) apontam para um evento específico
      if (eventIds.length > 0) {
        const { data } = await supabase.from('meetings').select('*').in('id', eventIds);
        data?.forEach((m) => collected.set(m.id, m));
      }

      // Convidado sem grupo: mostra eventos abertos do Gente HUB
      if (teamIds.length === 0) {
        const { data } = await supabase.from('meetings').select('*').eq('event_type', 'hub_event');
        data?.forEach((m) => collected.set(m.id, m));
      }

      const relevantMeetings = Array.from(collected.values())
        .filter((m) => {
          const d = parseLocalDate(m.meeting_date);
          return isToday(d) || isFuture(d);
        })
        .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));

      // Fetch team info
      const teams: Record<string, { name: string; color: string }> = {};
      const teamIdsToFetch = Array.from(
        new Set(relevantMeetings.map((m) => m.team_id).filter(Boolean) as string[]),
      );
      if (teamIdsToFetch.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, color')
          .in('id', teamIdsToFetch);
        teamsData?.forEach(t => { teams[t.id] = t; });
      }

      // Fetch attendances for these meetings
      const meetingIds = relevantMeetings.map(m => m.id);
      let attendances: { meeting_id: string; user_id: string }[] = [];
      if (meetingIds.length > 0) {
        const { data } = await supabase
          .from('attendances')
          .select('meeting_id, user_id')
          .in('meeting_id', meetingIds);
        attendances = data || [];
      }

      return relevantMeetings.map(m => ({
        ...m,
        team: m.team_id ? teams[m.team_id] : null,
        attendees_count: attendances.filter(a => a.meeting_id === m.id).length,
        is_attending: attendances.some(a => a.meeting_id === m.id && a.user_id === user?.id),
      }));
    },
    enabled: !!guestData,
  });


  const confirmAttendance = useMutation({
    mutationFn: async (meetingId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('attendances')
        .insert({ meeting_id: meetingId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({
        title: 'Presença confirmada!',
        description: 'Você confirmou sua participação no encontro. Aguardamos você!',
      });
    },
    onError: (e: any) => {
      const msg = e.message?.includes('duplicate')
        ? 'Você já confirmou presença neste encontro'
        : 'Erro ao confirmar presença';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const cancelAttendance = useMutation({
    mutationFn: async (meetingId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('attendances')
        .delete()
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({
        title: 'Presença cancelada',
        description: 'Sua presença foi cancelada.',
      });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao cancelar presença', variant: 'destructive' });
    },
  });

  return {
    guestData,
    guestMeetings,
    isLoading: isLoadingGuestData || isLoadingMeetings,
    confirmAttendance,
    cancelAttendance,
  };
}
