import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromoteGuestParams {
  userId: string;
  targetRole: 'membro' | 'facilitador';
  teamId?: string;
}

export function usePromoteGuest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const promoteMutation = useMutation({
    mutationFn: async ({ userId, targetRole, teamId }: PromoteGuestParams) => {
      const { data, error } = await supabase.rpc('promote_guest_to_member', {
        _guest_id: userId,
        _target_role: targetRole,
        _team_id: teamId || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Erro ao promover convidado');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-guest-records'] });
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      queryClient.invalidateQueries({ queryKey: ['members-directory'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['all-people-admin'] });
      
      const roleLabel = variables.targetRole === 'facilitador' ? 'Facilitador' : 'Membro';
      toast({
        title: 'Promoção realizada!',
        description: `O convidado foi promovido para ${roleLabel} com sucesso.`,
      });
    },
    onError: (error: any) => {
      console.error('Erro ao promover convidado:', error);
      toast({
        title: 'Erro na promoção',
        description: error.message || 'Não foi possível promover o convidado. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    promoteGuest: promoteMutation.mutate,
    isPromoting: promoteMutation.isPending,
  };
}
