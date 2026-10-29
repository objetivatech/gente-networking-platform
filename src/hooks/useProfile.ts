import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizePayload } from '@/lib/form-utils';
import type { ConnectionDoors } from '@/lib/connection-doors';

export interface Profile extends ConnectionDoors {
  ai_pitch: string | null;
  what_i_do: string | null;
  ideal_client: string | null;
  how_to_refer_me: string | null;
  tags: string[] | null;
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  business_segment: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  birthday: string | null;
  rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante';
  points: number;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Sanitização centralizada: trim + strings vazias viram null
      const cleaned = sanitizePayload(updates);

      const { data, error } = await supabase
        .from('profiles')
        .update(cleaned)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', user?.id], data);
      ['profile', 'connection-doors', 'matchmaking', 'community-showcase', 'community-profile', 'members-directory', 'member-profile', 'profiles-completeness'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast({
        title: 'Sucesso!',
        description: 'Perfil atualizado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar perfil',
        variant: 'destructive',
      });
      console.error('Erro ao atualizar perfil:', error);
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutate,
    updateProfileAsync: updateProfile.mutateAsync,
    isUpdating: updateProfile.isPending,
  };
}
