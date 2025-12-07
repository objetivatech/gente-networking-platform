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
      return data?.role || 'convidado';
    },
    enabled: !!user?.id,
  });
}

export function useAdmin() {
  const { data: role, isLoading } = useUserRole();
  const isAdmin = role === 'admin';
  const isFacilitator = role === 'facilitador';
  const isMember = role === 'membro';
  const isGuest = role === 'convidado';
  const canManage = isAdmin || isFacilitator;
  
  return { role, isLoading, isAdmin, isFacilitator, isMember, isGuest, canManage };
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
      const msg = e.message?.includes('duplicate') ? 'Membro já está na equipe' : 
                  e.message?.includes('policy') ? 'Você só pode adicionar convidados à sua equipe' :
                  'Erro ao adicionar membro';
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

// Hook para gerenciar roles de usuários (apenas admin)
export function useAdminRoles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os usuários com role 'convidado'
  const { data: guests, isLoading: loadingGuests } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            email,
            company,
            avatar_url
          )
        `)
        .eq('role', 'convidado');
      if (error) throw error;
      return data;
    },
  });

  // Promover convidado para membro
  const promoteToMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'membro' })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({ title: 'Sucesso!', description: 'Usuário promovido a membro' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao promover usuário', variant: 'destructive' });
    },
  });

  // Promover para facilitador
  const promoteToFacilitator = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'facilitador' })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({ title: 'Sucesso!', description: 'Usuário promovido a facilitador' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao promover usuário', variant: 'destructive' });
    },
  });

  // Rebaixar para convidado
  const demoteToGuest = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'convidado' })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({ title: 'Sucesso!', description: 'Usuário rebaixado a convidado' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao rebaixar usuário', variant: 'destructive' });
    },
  });

  return { 
    guests, 
    loadingGuests, 
    promoteToMember, 
    promoteToFacilitator,
    demoteToGuest 
  };
}
