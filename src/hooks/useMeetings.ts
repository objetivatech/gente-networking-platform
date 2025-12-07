import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export function useMeetings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('meetings').select('*').order('meeting_date', { ascending: false });
      if (error) throw error;

      // Fetch teams
      const teamIds = data.filter(m => m.team_id).map(m => m.team_id);
      let teams: Record<string, any> = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase.from('teams').select('id, name, color').in('id', teamIds);
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
      toast({ title: 'Sucesso!', description: 'Presença atualizada' });
    },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao atualizar presença', variant: 'destructive' }); },
  });

  return { meetings, myAttendances, isLoading, toggleAttendance };
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
