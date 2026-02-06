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
      // 1. Verificar se o usuário já tem um role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Atualizar role existente
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: targetRole })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Criar novo role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: targetRole });

        if (insertError) throw insertError;
      }

      // 2. Se um grupo foi selecionado, adicionar o membro ao grupo
      if (teamId) {
        // Verificar se já está no grupo
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', userId)
          .eq('team_id', teamId)
          .maybeSingle();

        if (!existingMember) {
          const { error: teamError } = await supabase
            .from('team_members')
            .insert({
              user_id: userId,
              team_id: teamId,
              is_facilitator: targetRole === 'facilitador',
            });

          if (teamError) throw teamError;
        }
      }

      return { userId, targetRole, teamId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-guest-records'] });
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      queryClient.invalidateQueries({ queryKey: ['members-directory'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      
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
        description: 'Não foi possível promover o convidado. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    promoteGuest: promoteMutation.mutate,
    isPromoting: promoteMutation.isPending,
  };
}
