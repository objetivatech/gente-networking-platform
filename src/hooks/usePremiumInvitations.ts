/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { useToast } from './use-toast';
interface PremiumInvitation { id: string; status: string; title: string; meeting_date: string; meeting_time: string | null; location: string | null; team_name: string | null }
export function usePremiumInvitations() {
  const { user } = useAuth();
  const { isSubscriber } = useAdmin();
  const qc = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({ queryKey: ['premium-invitations', user?.id], enabled: !!user && isSubscriber,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_premium_invitations');
      if (error) throw error;
      return data as unknown as PremiumInvitation[];
    },
  });
  const respond = useMutation({ mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
    const { error } = await supabase.rpc('respond_premium_invitation', { _participation_id: id, _accept: accept });
    if (error) throw error;
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['premium-invitations'] }); toast({ title: 'Resposta registrada' }); },
    onError: () => toast({ title: 'Não foi possível responder ao convite', variant: 'destructive' }),
  });
  return { ...query, respond };
}