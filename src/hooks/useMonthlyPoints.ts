import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface MonthlyPointsData {
  team_id: string;
  team_name: string;
  points: number;
  rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante';
  year_month: string;
}

export function useMonthlyPoints(userId?: string, teamId?: string, yearMonth?: string) {
  const currentMonth = yearMonth || format(new Date(), 'yyyy-MM');
  
  return useQuery({
    queryKey: ['monthly-points', userId, teamId, currentMonth],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase.rpc('get_user_monthly_points', {
        _user_id: userId,
        _team_id: teamId || null,
        _year_month: currentMonth,
      });

      if (error) throw error;
      
      return (data || []) as MonthlyPointsData[];
    },
    enabled: !!userId,
  });
}

export function useRecalculateMonthlyPoints() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (yearMonth?: string) => {
      const { data, error } = await supabase.rpc('recalculate_all_monthly_points', {
        _year_month: yearMonth || null,
      });
      
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-points'] });
      toast({
        title: 'Pontos recalculados!',
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
}

export function useMonthlyPointsHistory(userId?: string, teamId?: string) {
  return useQuery({
    queryKey: ['monthly-points-history', userId, teamId],
    queryFn: async () => {
      if (!userId) return [];
      
      let query = supabase
        .from('monthly_points')
        .select(`
          *,
          teams:team_id(name)
        `)
        .eq('user_id', userId)
        .order('year_month', { ascending: false });
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!userId,
  });
}
