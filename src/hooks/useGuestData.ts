import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isFuture, isToday } from 'date-fns';
import { parseLocalDate } from '@/lib/date-utils';

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
      if (!user?.id) return { invitation: null, inviter: null, inviterTeams: [], allowedTeamIds: [] };

      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .select('id, code, invited_by, created_at, accepted_at, metadata')
        .eq('accepted_by', user.id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (invError || !invitation) {
        return { invitation: null, inviter: null, inviterTeams: [], allowedTeamIds: [] };
      }

      // Use allowed_team_ids from metadata snapshot (stable), fallback to current inviter teams
      const metadata = invitation.metadata as Record<string, unknown> | null;
      let allowedTeamIds: string[] = [];

      if (metadata?.allowed_team_ids && Array.isArray(metadata.allowed_team_ids)) {
        allowedTeamIds = metadata.allowed_team_ids as string[];
      }

      // Fallback: if no snapshot, use inviter's current teams
      if (allowedTeamIds.length === 0) {
        const { data: teamMemberships } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', invitation.invited_by);
        allowedTeamIds = teamMemberships?.map(tm => tm.team_id) || [];
      }

      // Final fallback: if still empty, use ALL teams so guest sees something
      if (allowedTeamIds.length === 0) {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id');
        allowedTeamIds = allTeams?.map(t => t.id) || [];
      }

      // Fetch inviter profile
      const { data: inviter } = await supabase
        .from('profiles')
        .select('id, full_name, company, avatar_url')
        .eq('id', invitation.invited_by)
        .maybeSingle();

      // Fetch team details
      let inviterTeams: { id: string; name: string; color: string }[] = [];
      if (allowedTeamIds.length > 0) {
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name, color')
          .in('id', allowedTeamIds);
        inviterTeams = teams || [];
      }

      return { invitation, inviter, inviterTeams, allowedTeamIds };
    },
    enabled: !!user?.id,
  });

  const { data: guestMeetings, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['guest-meetings', guestData?.allowedTeamIds?.join(',')],
    queryFn: async (): Promise<GuestMeeting[]> => {
      const teamIds = guestData?.allowedTeamIds || [];

      if (teamIds.length === 0) return [];

      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .in('team_id', teamIds)
        .order('meeting_date', { ascending: true });

      if (error) throw error;

      // Include today AND future meetings
      const relevantMeetings = meetings?.filter(m => {
        const d = parseLocalDate(m.meeting_date);
        return isToday(d) || isFuture(d);
      }) || [];

      // Fetch team info
      const teams: Record<string, { name: string; color: string }> = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, color')
          .in('id', teamIds);
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
    enabled: !!guestData?.allowedTeamIds && guestData.allowedTeamIds.length > 0,
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
