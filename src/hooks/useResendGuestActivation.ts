/**
 * Reenvio controlado do acesso de ativação de convidados.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useResendGuestActivation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.functions.invoke('resend-guest-activation', {
        body: { lead_id: leadId },
      });
      if (error || data?.ok !== true) throw error || new Error('Não foi possível reenviar a ativação.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests-directory'] });
      toast({ title: 'Ativação reenviada', description: 'O novo envio foi registrado na jornada.' });
    },
    onError: () => {
      toast({
        title: 'Reenvio não realizado',
        description: 'Confira se o convite ainda está pendente e dentro da validade.',
        variant: 'destructive',
      });
    },
  });

  return { resendActivation: mutation.mutate, isResending: mutation.isPending };
}