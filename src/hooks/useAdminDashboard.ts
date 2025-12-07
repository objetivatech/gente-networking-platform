import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export function useAdminDashboard() {
  // Stats gerais
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [
        { count: totalMembers },
        { count: totalTeams },
        { data: dealsData },
        { count: totalTestimonials },
        { count: totalReferrals },
        { count: totalGenteEmAcao },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('business_deals').select('value'),
        supabase.from('testimonials').select('*', { count: 'exact', head: true }),
        supabase.from('referrals').select('*', { count: 'exact', head: true }),
        supabase.from('gente_em_acao').select('*', { count: 'exact', head: true }),
      ]);

      const totalBusinessValue = dealsData?.reduce((acc, deal) => acc + Number(deal.value), 0) || 0;

      return {
        totalMembers: totalMembers || 0,
        totalTeams: totalTeams || 0,
        totalBusinessValue,
        totalTestimonials: totalTestimonials || 0,
        totalReferrals: totalReferrals || 0,
        totalGenteEmAcao: totalGenteEmAcao || 0,
      };
    },
  });

  // Distribuição por rank
  const { data: rankDistribution } = useQuery({
    queryKey: ['admin-rank-distribution'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('rank');
      
      const distribution = {
        iniciante: 0,
        bronze: 0,
        prata: 0,
        ouro: 0,
        diamante: 0,
      };

      data?.forEach((p) => {
        const rank = p.rank || 'iniciante';
        distribution[rank as keyof typeof distribution]++;
      });

      return Object.entries(distribution).map(([name, value]) => ({ name, value }));
    },
  });

  // Atividades por mês (últimos 6 meses)
  const { data: monthlyActivity } = useQuery({
    queryKey: ['admin-monthly-activity'],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const [
          { count: genteEmAcao },
          { count: testimonials },
          { count: referrals },
          { data: deals },
        ] = await Promise.all([
          supabase
            .from('gente_em_acao')
            .select('*', { count: 'exact', head: true })
            .gte('meeting_date', format(start, 'yyyy-MM-dd'))
            .lte('meeting_date', format(end, 'yyyy-MM-dd')),
          supabase
            .from('testimonials')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('business_deals')
            .select('value')
            .gte('deal_date', format(start, 'yyyy-MM-dd'))
            .lte('deal_date', format(end, 'yyyy-MM-dd')),
        ]);

        const businessValue = deals?.reduce((acc, d) => acc + Number(d.value), 0) || 0;

        months.push({
          month: format(date, 'MMM'),
          genteEmAcao: genteEmAcao || 0,
          depoimentos: testimonials || 0,
          indicacoes: referrals || 0,
          negocios: businessValue,
        });
      }

      return months;
    },
  });

  // Top membros por pontos
  const { data: topMembers } = useQuery({
    queryKey: ['admin-top-members'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, points, rank, company')
        .order('points', { ascending: false })
        .limit(10);

      return data || [];
    },
  });

  // Atividades recentes
  const { data: recentActivity, isLoading: loadingActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_feed')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(20);

      return data || [];
    },
  });

  return {
    stats,
    loadingStats,
    rankDistribution,
    monthlyActivity,
    topMembers,
    recentActivity,
    loadingActivity,
  };
}
