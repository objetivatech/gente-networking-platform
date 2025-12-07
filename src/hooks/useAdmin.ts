import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data?.role || 'membro';
    },
    enabled: !!user?.id,
  });
}

export function useAdminTeams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTeam = useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string }) => {
      const { data, error } = await supabase.from('teams').insert({
        name: input.name,
        description: input.description,
        color: input.color || '#22c55e',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Sucesso!', description: 'Equipe criada' }); },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao criar equipe', variant: 'destructive' }); },
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string; color?: string }) => {
      const { error } = await supabase.from('teams').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Sucesso!', description: 'Equipe atualizada' }); },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('teams').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Sucesso!', description: 'Equipe removida' }); },
  });

  const addMember = useMutation({
    mutationFn: async ({ teamId, userId, isFacilitator = false }: { teamId: string; userId: string; isFacilitator?: boolean }) => {
      const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id: userId, is_facilitator: isFacilitator });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Sucesso!', description: 'Membro adicionado' }); },
    onError: (e: any) => { 
      const msg = e.message?.includes('duplicate') ? 'Membro já está na equipe' : 'Erro ao adicionar membro';
      toast({ title: 'Erro', description: msg, variant: 'destructive' }); 
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Sucesso!', description: 'Membro removido' }); },
  });

  const toggleFacilitator = useMutation({
    mutationFn: async ({ teamId, userId, isFacilitator }: { teamId: string; userId: string; isFacilitator: boolean }) => {
      const { error } = await supabase.from('team_members').update({ is_facilitator: isFacilitator }).eq('team_id', teamId).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Sucesso!', description: 'Status atualizado' }); },
  });

  return { createTeam, updateTeam, deleteTeam, addMember, removeMember, toggleFacilitator };
}

export function useAdminMeetings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMeeting = useMutation({
    mutationFn: async (input: { title: string; description?: string; meeting_date: string; meeting_time?: string; location?: string; team_id?: string }) => {
      const { data, error } = await supabase.from('meetings').insert({
        ...input,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meetings'] }); toast({ title: 'Sucesso!', description: 'Encontro criado' }); },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao criar encontro', variant: 'destructive' }); },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('meetings').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meetings'] }); toast({ title: 'Sucesso!', description: 'Encontro removido' }); },
  });

  return { createMeeting, deleteMeeting };
}
