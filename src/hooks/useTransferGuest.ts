/**
 * @hook useTransferGuest
 * @description Transfere um convidado de um grupo para outro via RPC transfer_guest_to_team.
 * @access Admin (qualquer convidado/grupo) | Facilitador (apenas convidados do próprio grupo)
 * @copyright Ranktop
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TransferInput {
  guestId: string;
  newTeamId: string;
}

export function useTransferGuest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ guestId, newTeamId }: TransferInput) => {
      const { data, error } = await supabase.rpc('transfer_guest_to_team', {
        _guest_id: guestId,
        _new_team_id: newTeamId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string } | null;
      if (result && !result.success) {
        throw new Error(result.error || 'Erro ao transferir convidado');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-people-admin'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Convidado transferido',
        description: 'O convidado foi movido para o novo grupo com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível transferir o convidado.',
        variant: 'destructive',
      });
    },
  });

  return {
    transferGuest: mutation.mutate,
    isTransferring: mutation.isPending,
  };
}
