import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isFuture } from 'date-fns';
import { parseLocalDate } from '@/lib/date-utils';

export interface GuestInvitationData {
  invitation: {
    id: string;
    code: string;
    invited_by: string;
    created_at: string;
    accepted_at: string | null;
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

  // Buscar dados do convite do convidado atual
  const { data: guestData, isLoading: isLoadingGuestData } = useQuery({
    queryKey: ['guest-invitation-data', user?.id],
    queryFn: async (): Promise<GuestInvitationData> => {
      if (!user?.id) return { invitation: null, inviter: null, inviterTeams: [] };

      // Buscar convite aceito por este usuário
      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .select('id, code, invited_by, created_at, accepted_at')
        .eq('accepted_by', user.id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (invError || !invitation) {
        return { invitation: null, inviter: null, inviterTeams: [] };
      }

      // Buscar perfil do membro que convidou
      const { data: inviter } = await supabase
        .from('profiles')
        .select('id, full_name, company, avatar_url')
        .eq('id', invitation.invited_by)
        .maybeSingle();

      // Buscar grupos do membro que convidou
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', invitation.invited_by);

      const teamIds = teamMemberships?.map(tm => tm.team_id) || [];
      
      let inviterTeams: { id: string; name: string; color: string }[] = [];
      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name, color')
          .in('id', teamIds);
        inviterTeams = teams || [];
      }

      return { invitation, inviter, inviterTeams };
    },
    enabled: !!user?.id,
  });

  // Buscar encontros filtrados pelos grupos do membro que convidou
  const { data: guestMeetings, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['guest-meetings', guestData?.inviterTeams?.map(t => t.id).join(',')],
    queryFn: async (): Promise<GuestMeeting[]> => {
      const teamIds = guestData?.inviterTeams?.map(t => t.id) || [];
      
      if (teamIds.length === 0) {
        return [];
      }

      // Buscar encontros dos grupos do membro que convidou
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .in('team_id', teamIds)
        .order('meeting_date', { ascending: true });

      if (error) throw error;

      // Filtrar apenas encontros futuros
      const futureMeetings = meetings?.filter(m => isFuture(parseLocalDate(m.meeting_date))) || [];

      // Buscar informações dos grupos
      let teams: Record<string, any> = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, color')
          .in('id', teamIds);
        teamsData?.forEach(t => { teams[t.id] = t; });
      }

      // Buscar presenças
      const { data: attendances } = await supabase
        .from('attendances')
        .select('meeting_id, user_id');

      return futureMeetings.map(m => ({
        ...m,
        team: m.team_id ? teams[m.team_id] : null,
        attendees_count: attendances?.filter(a => a.meeting_id === m.id).length || 0,
        is_attending: attendances?.some(a => a.meeting_id === m.id && a.user_id === user?.id) || false,
      }));
    },
    enabled: !!guestData?.inviterTeams && guestData.inviterTeams.length > 0,
  });

  // Confirmar presença em um encontro
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
        description: 'Você confirmou sua participação no encontro. Aguardamos você!' 
      });
    },
    onError: (e: any) => {
      const msg = e.message?.includes('duplicate') 
        ? 'Você já confirmou presença neste encontro' 
        : 'Erro ao confirmar presença';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  // Cancelar presença
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
        description: 'Sua presença foi cancelada.' 
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
