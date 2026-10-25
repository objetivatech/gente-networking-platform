import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { communityStatistics, globalStatistics, personalStatistics, type StatisticsSnapshot } from '@/lib/statistics';

export type Stats = ReturnType<typeof personalStatistics>;
export async function fetchStatisticsSnapshot(scope: 'personal' | 'community' | 'admin', teamId?: string) {
  const { data, error } = await supabase.rpc('get_statistics_snapshot', { _scope: scope, _team_id: teamId || null });
  if (error) throw error;
  if (!data) throw new Error('Indicadores indisponíveis');
  return data as unknown as StatisticsSnapshot;
}
export function useStats(period: 'month' | 'year' = 'month', enabled = true) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['stats', user?.id, period, new Date().getFullYear(), new Date().getMonth()], queryFn: async () => personalStatistics(await fetchStatisticsSnapshot('personal'), period), enabled: !!user?.id && enabled, refetchOnWindowFocus: true });
}
export function useCommunityStats(teamId?: string) {
  const { user } = useAuth();
  const { isGuest, isSubscriber, isLoading } = useAdmin();
  return useQuery({ queryKey: ['community-stats', user?.id, teamId || 'all'], queryFn: async () => communityStatistics(await fetchStatisticsSnapshot('community', teamId)), enabled: !!user?.id && !isLoading && !isGuest && !isSubscriber, refetchOnWindowFocus: true });
}
export function useAdminGlobalStats() {
  const { user } = useAuth();
  const { canManage } = useAdmin();
  return useQuery({ queryKey: ['admin-global-stats', user?.id], queryFn: async () => globalStatistics(await fetchStatisticsSnapshot('admin')), enabled: !!user?.id && canManage, refetchOnWindowFocus: true });
}
