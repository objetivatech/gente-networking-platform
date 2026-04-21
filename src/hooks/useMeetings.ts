import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseReadOnly } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Meeting {
  id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  created_by: string | null;
  created_at: string;
  team?: { name: string; color: string } | null;
  attendees_count?: number;
  is_attending?: boolean;
}

export interface Attendance {
  id: string;
  meeting_id: string;
  user_id: string;
  registered_at: string;
  profile?: { full_name: string; company: string | null; avatar_url: string | null };
}

export interface MeetingGuest {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  company: string | null;
}

export function useMeetings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabaseReadOnly.from('meetings').select('*').order('meeting_date', { ascending: true });
      if (error) throw error;

      // Fetch teams
      const teamIds = data.filter(m => m.team_id).map(m => m.team_id);
      let teams: Record<string, any> = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabaseReadOnly.from('teams').select('id, name, color').in('id', teamIds);
        teamsData?.forEach(t => { teams[t.id] = t; });
      }

      // Fetch attendance counts
      const { data: attendances } = await supabase.from('attendances').select('meeting_id, user_id');
      
      return data.map(m => ({
        ...m,
        team: m.team_id ? teams[m.team_id] : null,
        attendees_count: attendances?.filter(a => a.meeting_id === m.id).length || 0,
        is_attending: attendances?.some(a => a.meeting_id === m.id && a.user_id === user?.id) || false,
      })) as Meeting[];
    },
  });

  const { data: myAttendances } = useQuery({
    queryKey: ['my-attendances', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendances').select('*').eq('user_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const toggleAttendance = useMutation({
    mutationFn: async ({ meetingId, isAttending }: { meetingId: string; isAttending: boolean }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (isAttending) {
        const { error } = await supabase.from('attendances').delete().eq('meeting_id', meetingId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendances').insert({ meeting_id: meetingId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-attendees'] });
      toast({ title: 'Sucesso!', description: 'Presença atualizada' });
    },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao atualizar presença', variant: 'destructive' }); },
  });

  const removeAttendance = useMutation({
    mutationFn: async ({ meetingId, userId }: { meetingId: string; userId: string }) => {
      const { error } = await supabase.from('attendances').delete().eq('meeting_id', meetingId).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-attendees'] });
      toast({ title: 'Sucesso!', description: 'Presença removida' });
    },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao remover presença', variant: 'destructive' }); },
  });

  return { meetings, myAttendances, isLoading, toggleAttendance, removeAttendance };
}

export function useMeetingAttendees(meetingId: string) {
  return useQuery({
    queryKey: ['meeting-attendees', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendances').select('*').eq('meeting_id', meetingId);
      if (error) throw error;

      const userIds = data.map(a => a.user_id);
      let profiles: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, company, avatar_url').in('id', userIds);
        profilesData?.forEach(p => { profiles[p.id] = p; });
      }

      return data.map(a => ({ ...a, profile: profiles[a.user_id] })) as Attendance[];
    },
    enabled: !!meetingId,
  });
}

export function useMeetingGuests(meetingId: string) {
  return useQuery({
    queryKey: ['meeting-guests', meetingId],
    queryFn: async () => {
      const { data: meetingAttendances, error: attendancesError } = await supabase
        .from('attendances')
        .select('user_id')
        .eq('meeting_id', meetingId);

      if (attendancesError) throw attendancesError;
      if (!meetingAttendances?.length) return [] as MeetingGuest[];

      const attendeeIds = [...new Set(meetingAttendances.map(a => a.user_id))];

      const [{ data: rolesData, error: rolesError }, { data: invitationsData, error: invitationsError }] = await Promise.all([
        supabase.from('user_roles').select('user_id, role').in('user_id', attendeeIds),
        supabase.from('invitations').select('accepted_by').eq('status', 'accepted').in('accepted_by', attendeeIds),
      ]);

      if (rolesError) throw rolesError;
      if (invitationsError) throw invitationsError;

      const rolesByUser = new Map<string, Set<string>>();
      rolesData?.forEach(({ user_id, role }) => {
        const roles = rolesByUser.get(user_id) ?? new Set<string>();
        roles.add(role);
        rolesByUser.set(user_id, roles);
      });

      const invitationGuestIds = new Set((invitationsData ?? []).map(inv => inv.accepted_by).filter(Boolean) as string[]);

      const guestUserIds = attendeeIds.filter((userId) => {
        const roles = rolesByUser.get(userId) ?? new Set<string>();
        const hasMemberRole = roles.has('admin') || roles.has('facilitador') || roles.has('membro');
        const hasGuestRole = roles.has('convidado');
        const isGuestByInvitation = invitationGuestIds.has(userId) && !hasMemberRole;

        return (hasGuestRole && !hasMemberRole) || isGuestByInvitation;
      });

      if (!guestUserIds.length) return [] as MeetingGuest[];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, company')
        .in('id', guestUserIds);

      if (profilesError) throw profilesError;

      return (profiles ?? []) as MeetingGuest[];
    },
    enabled: !!meetingId,
  });
}

/**
 * Lista convidados (role = 'convidado') confirmados em encontros futuros.
 * Agrupa por encontro para alimentar a aba "Convidados em Encontros" em /encontros.
 */
export interface UpcomingGuestEntry {
  meeting_id: string;
  meeting_title: string;
  meeting_date: string;
  meeting_time: string | null;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  guests: Array<{
    id: string;
    full_name: string;
    company: string | null;
    avatar_url: string | null;
    invited_by_name: string | null;
  }>;
}

export function useUpcomingMeetingGuests() {
  return useQuery({
    queryKey: ['upcoming-meeting-guests'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<UpcomingGuestEntry[]> => {
      const today = new Date().toISOString().slice(0, 10);

      const { data: meetings } = await supabaseReadOnly
        .from('meetings')
        .select('id, title, meeting_date, meeting_time, team_id')
        .gte('meeting_date', today)
        .order('meeting_date', { ascending: true });

      if (!meetings?.length) return [];

      const meetingIds = meetings.map(m => m.id);
      const { data: attendances } = await supabaseReadOnly
        .from('attendances')
        .select('meeting_id, user_id')
        .in('meeting_id', meetingIds);

      const userIds = Array.from(new Set((attendances || []).map(a => a.user_id)));
      if (!userIds.length) return [];

      const { data: roles } = await supabaseReadOnly
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      const guestIds = new Set(roles?.filter(r => r.role === 'convidado').map(r => r.user_id) || []);
      const memberIds = new Set(roles?.filter(r => ['admin', 'facilitador', 'membro'].includes(r.role)).map(r => r.user_id) || []);

      const validGuestIds = Array.from(guestIds).filter(id => !memberIds.has(id));
      if (!validGuestIds.length) return [];

      const { data: profiles } = await supabaseReadOnly
        .from('profiles')
        .select('id, full_name, company, avatar_url')
        .in('id', validGuestIds);
      const profMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const { data: invitations } = await supabaseReadOnly
        .from('invitations')
        .select('accepted_by, invited_by')
        .eq('status', 'accepted')
        .in('accepted_by', validGuestIds);
      const inviterIds = Array.from(new Set(invitations?.map(i => i.invited_by).filter(Boolean) as string[]));
      const { data: inviters } = inviterIds.length
        ? await supabaseReadOnly.from('profiles').select('id, full_name').in('id', inviterIds)
        : { data: [] as any[] };
      const inviterNameMap = new Map<string, string>();
      inviters?.forEach((p: any) => inviterNameMap.set(p.id, p.full_name));
      const inviterByGuest = new Map<string, string>();
      invitations?.forEach(i => {
        if (i.accepted_by && i.invited_by) inviterByGuest.set(i.accepted_by, i.invited_by);
      });

      const teamIds = Array.from(new Set(meetings.map(m => m.team_id).filter(Boolean) as string[]));
      const { data: teams } = teamIds.length
        ? await supabaseReadOnly.from('teams').select('id, name, color').in('id', teamIds)
        : { data: [] as any[] };
      const teamMap = new Map<string, { name: string; color: string | null }>();
      teams?.forEach((t: any) => teamMap.set(t.id, { name: t.name, color: t.color }));

      const result: UpcomingGuestEntry[] = [];
      meetings.forEach(m => {
        const guestsHere = (attendances || [])
          .filter(a => a.meeting_id === m.id && validGuestIds.includes(a.user_id))
          .map(a => {
            const p = profMap.get(a.user_id);
            const inviterId = inviterByGuest.get(a.user_id);
            return {
              id: a.user_id,
              full_name: p?.full_name || 'Convidado',
              company: p?.company ?? null,
              avatar_url: p?.avatar_url ?? null,
              invited_by_name: inviterId ? inviterNameMap.get(inviterId) ?? null : null,
            };
          });
        if (!guestsHere.length) return;
        const team = m.team_id ? teamMap.get(m.team_id) : null;
        result.push({
          meeting_id: m.id,
          meeting_title: m.title,
          meeting_date: m.meeting_date,
          meeting_time: m.meeting_time,
          team_id: m.team_id,
          team_name: team?.name ?? null,
          team_color: team?.color ?? null,
          guests: guestsHere,
        });
      });
      return result;
    },
  });
}
