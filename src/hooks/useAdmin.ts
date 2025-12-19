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

  // Buscar todos os usuários com role 'convidado' (incluindo quem não tem role definido)
  const { data: guests, isLoading: loadingGuests } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      // Buscar todos os profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, company, avatar_url, is_active')
        .eq('is_active', true)
        .order('full_name');
      
      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Map de user_id -> role
      const rolesMap: Record<string, string> = {};
      roles?.forEach(r => {
        rolesMap[r.user_id] = r.role;
      });

      // Filtrar apenas convidados (quem tem role=convidado ou não tem role)
      const guestsData = profiles
        ?.filter(profile => {
          const role = rolesMap[profile.id];
          return role === 'convidado' || !role;
        })
        .map(profile => ({
          user_id: profile.id,
          role: 'convidado' as const,
          profiles: profile
        }));

      return guestsData || [];
    },
  });

  // Promover convidado para membro (usa upsert para incluir quem não tem role)
  const promoteToMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'membro' }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['members-directory'] });
      toast({ title: 'Sucesso!', description: 'Usuário promovido a membro' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao promover usuário', variant: 'destructive' });
    },
  });

  // Promover para facilitador (usa upsert para incluir quem não tem role)
  const promoteToFacilitator = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'facilitador' }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['members-directory'] });
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

// Hook para gerenciar presença de convidados em encontros
export function useGuestAttendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as presenças
  const { data: attendances } = useQuery({
    queryKey: ['all-attendances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendances').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Verificar se um convidado já está presente em um encontro
  const isGuestAttending = (guestId: string, meetingId: string) => {
    return attendances?.some(a => a.user_id === guestId && a.meeting_id === meetingId) || false;
  };

  // Registrar presença de convidado
  const registerGuestAttendance = useMutation({
    mutationFn: async ({ guestId, meetingId }: { guestId: string; meetingId: string }) => {
      const { error } = await supabase
        .from('attendances')
        .insert({ user_id: guestId, meeting_id: meetingId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-attendees'] });
      toast({ title: 'Sucesso!', description: 'Presença do convidado registrada' });
    },
    onError: (e: any) => {
      const msg = e.message?.includes('duplicate') ? 'Convidado já está presente neste encontro' : 'Erro ao registrar presença';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  return { 
    attendances,
    isGuestAttending, 
    registerGuestAttendance 
  };
}
