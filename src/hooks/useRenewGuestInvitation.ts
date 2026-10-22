/**
 * Renovação de convite vencido a partir do diretório de convidados.
 * Gera novo código (preservando o histórico) e reenvia o e-mail de ativação.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRenewGuestInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ invitationId, leadId }: { invitationId: string; leadId: string | null }) => {
      const { data, error } = await supabase.rpc('renew_guest_invitation', { _invitation_id: invitationId });
      if (error) throw error;
      const result = data as Record<string, unknown> | null;
      if (!result?.success) throw new Error('Não foi possível renovar o convite.');
      if (leadId) {
        const { data: sent, error: sendError } = await supabase.functions.invoke('resend-guest-activation', {
          body: { lead_id: leadId },
        });
        if (sendError || sent?.ok !== true) return { emailSent: false };
      }
      return { emailSent: !!leadId };
    },
    onSuccess: ({ emailSent }) => {
      queryClient.invalidateQueries({ queryKey: ['guests-directory'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Convite renovado',
        description: emailSent
          ? 'Novo código com validade de 30 dias criado e enviado por e-mail.'
          : 'Novo código criado. O e-mail não foi enviado; use "Reenviar ativação".',
      });
    },
    onError: (e: Error) => {
      const msg = e.message?.includes('forbidden')
        ? 'Você só pode renovar convites do seu grupo.'
        : e.message?.includes('accepted')
          ? 'Este convite já foi aceito e não pode ser renovado.'
          : 'Não foi possível renovar o convite.';
      toast({ title: 'Renovação não realizada', description: msg, variant: 'destructive' });
    },
  });

  return { renewInvitation: mutation.mutate, isRenewing: mutation.isPending };
}
