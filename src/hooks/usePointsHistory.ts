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

  // Recalcula pontos MENSAIS por grupo (novo sistema v2.3.0)
  const recalculateAllMonthlyPoints = useMutation({
    mutationFn: async (yearMonth?: string) => {
      const { data, error } = await supabase.rpc('recalculate_all_monthly_points', {
        _year_month: yearMonth || null
      });
      
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-points'] });
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      toast({
        title: 'Pontos mensais recalculados!',
        description: `${count} usuários atualizados com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível recalcular os pontos mensais.',
        variant: 'destructive',
      });
      console.error('Error recalculating monthly points:', error);
    },
  });

  // Mantém compatibilidade com sistema legado (pontos globais)
  const recalculateAllPoints = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('recalculate_all_user_points');
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
      toast({
        title: 'Pontos legados recalculados!',
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
    recalculateAllMonthlyPoints,
  };
}
