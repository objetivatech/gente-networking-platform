/**
 * @hook useMoveGuestAttendance
 * @description Move a presença de um convidado de um encontro para outro encontro
 * futuro do mesmo grupo, via RPC `move_guest_attendance`.
 * @access Admin (qualquer grupo) | Facilitador (apenas próprio grupo)
 * @copyright Ranktop
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MoveInput {
  guestId: string;
  fromMeetingId: string;
  toMeetingId: string;
}

export function useMoveGuestAttendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ guestId, fromMeetingId, toMeetingId }: MoveInput) => {
      const { data, error } = await supabase.rpc('move_guest_attendance', {
        _guest_id: guestId,
        _from_meeting_id: fromMeetingId,
        _to_meeting_id: toMeetingId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string } | null;
      if (result && !result.success) {
        throw new Error(result.error || 'Erro ao mover convidado');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-attendees'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-guests'] });
      queryClient.invalidateQueries({ queryKey: ['guests-attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['guest-meetings'] });
      toast({
        title: 'Convidado movido',
        description: 'A presença foi transferida para o novo encontro.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível mover o convidado.',
        variant: 'destructive',
      });
    },
  });

  return {
    moveGuest: mutation.mutate,
    moveGuestAsync: mutation.mutateAsync,
    isMoving: mutation.isPending,
  };
}
