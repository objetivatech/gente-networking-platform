/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { GuestAgendaMeeting } from '@/lib/guest-agenda';
export function useGuestAgenda() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ['guest-agenda', user?.id], enabled: Boolean(user?.id),
    queryFn: async (): Promise<GuestAgendaMeeting[]> => {
      const { data, error } = await supabase.functions.invoke('guest-meetings', { body: { action: 'agenda' } });
      if (error || data?.error) throw new Error(data?.error ?? 'Não foi possível carregar a agenda');
      return data ?? [];
    },
  });
  const confirmation = useMutation({
    mutationFn: async ({ meetingId, confirm }: { meetingId: string; confirm: boolean }) => {
      const { data, error } = await supabase.functions.invoke('guest-meetings', { body: { action: 'confirm', meeting_id: meetingId, confirm } });
      if (error || data?.error) {
        let message = data?.error;
        if (!message && error && 'context' in error && error.context instanceof Response) {
          const body = await error.context.clone().json().catch(() => null);
          message = body?.error;
        }
        throw new Error(message ?? 'Não foi possível atualizar a participação. Tente novamente; se persistir, fale com o Facilitador.');
      }
    },
    onSuccess: (_, { confirm }) => {
      for (const key of ['guest-agenda', 'guest-meetings', 'meetings', 'meeting-attendees', 'meeting-guests', 'meeting-registrants', 'meeting-lead-attendances', 'meeting-invitations', 'guests-attendance-history', 'crm-leads']) qc.invalidateQueries({ queryKey: [key] });
      toast({ title: confirm ? 'Presença confirmada!' : 'Presença cancelada' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível atualizar', description: error.message, variant: 'destructive' }),
  });
  return { ...query, confirmation };
}