import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PointsHistoryEntry {
  id: string;
  user_id: string;
  points_before: number;
  points_after: number;
  points_change: number;
  rank_before: string | null;
  rank_after: string | null;
  reason: string | null;
  activity_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export function usePointsHistory(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ['points-history', userId],
    queryFn: async () => {
      let query = supabase
        .from('points_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PointsHistoryEntry[];
    },
    enabled: !!userId,
  });

  const recalculateAllPoints = useMutation({
    mutationFn: async () => {
      // Get all profile IDs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');
      
      if (profilesError) throw profilesError;

      let updated = 0;
      
      // Call the RPC function for each user
      for (const profile of profiles || []) {
        const { error } = await supabase.rpc('update_user_points_and_rank', {
          _user_id: profile.id
        });
        if (!error) updated++;
      }

      return updated;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
      toast({
        title: 'Pontos recalculados!',
        description: `${count} usuários atualizados com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível recalcular os pontos.',
        variant: 'destructive',
      });
      console.error('Error recalculating points:', error);
    },
  });

  return {
    history,
    isLoading,
    recalculateAllPoints,
  };
}
