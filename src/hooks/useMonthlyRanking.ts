import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface MonthlyRankedMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  company: string | null;
  member_position: string | null;
  team_id: string;
  team_name: string;
  points: number;
  rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante';
  position_rank: number;
}

export function useMonthlyRanking(teamId?: string, yearMonth?: string) {
  const currentMonth = yearMonth || format(new Date(), 'yyyy-MM');
  
  return useQuery({
    queryKey: ['monthly-ranking', teamId, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_ranking', {
        _team_id: teamId || null,
        _year_month: currentMonth,
      });

      if (error) throw error;
      
      return (data || []) as MonthlyRankedMember[];
    },
  });
}

export function useAvailableMonths() {
  return useQuery({
    queryKey: ['available-months'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_points')
        .select('year_month')
        .order('year_month', { ascending: false });

      if (error) throw error;
      
      // Get unique months
      const uniqueMonths = [...new Set(data?.map(d => d.year_month) || [])];
      
      // If no months exist, return current month
      if (uniqueMonths.length === 0) {
        uniqueMonths.push(format(new Date(), 'yyyy-MM'));
      }
      
      return uniqueMonths;
    },
  });
}
