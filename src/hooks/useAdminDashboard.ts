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
        { count: totalInvitations },
        { data: invitationsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('business_deals').select('value'),
        supabase.from('testimonials').select('*', { count: 'exact', head: true }),
        supabase.from('referrals').select('*', { count: 'exact', head: true }),
        supabase.from('gente_em_acao').select('*', { count: 'exact', head: true }),
        supabase.from('invitations').select('*', { count: 'exact', head: true }),
        supabase.from('invitations').select('status'),
      ]);

      const totalBusinessValue = dealsData?.reduce((acc, deal) => acc + Number(deal.value), 0) || 0;
      const acceptedInvitations = invitationsData?.filter(i => i.status === 'accepted').length || 0;

      return {
        totalMembers: totalMembers || 0,
        totalTeams: totalTeams || 0,
        totalBusinessValue,
        totalTestimonials: totalTestimonials || 0,
        totalReferrals: totalReferrals || 0,
        totalGenteEmAcao: totalGenteEmAcao || 0,
        totalInvitations: totalInvitations || 0,
        acceptedInvitations,
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

  // Métricas de convites por membro
  const { data: invitationMetrics } = useQuery({
    queryKey: ['admin-invitation-metrics'],
    queryFn: async () => {
      // Buscar todos os convites com informações do inviter
      const { data: invitations } = await supabase
        .from('invitations')
        .select('invited_by, status, accepted_by');

      if (!invitations) return [];

      // Agrupar por invited_by
      const metricsMap = new Map<string, { invited: number; accepted: number; attendedMeeting: number }>();

      invitations.forEach(inv => {
        const current = metricsMap.get(inv.invited_by) || { invited: 0, accepted: 0, attendedMeeting: 0 };
        current.invited++;
        if (inv.status === 'accepted') {
          current.accepted++;
        }
        metricsMap.set(inv.invited_by, current);
      });

      // Buscar presenças de convidados que compareceram a encontros
      const acceptedInvitations = invitations.filter(i => i.status === 'accepted' && i.accepted_by);
      const acceptedUserIds = acceptedInvitations.map(i => i.accepted_by).filter(Boolean);

      if (acceptedUserIds.length > 0) {
        const { data: attendances } = await supabase
          .from('attendances')
          .select('user_id')
          .in('user_id', acceptedUserIds as string[]);

        if (attendances) {
          const attendedUserIds = new Set(attendances.map(a => a.user_id));
          
          acceptedInvitations.forEach(inv => {
            if (inv.accepted_by && attendedUserIds.has(inv.accepted_by)) {
              const current = metricsMap.get(inv.invited_by);
              if (current) {
                current.attendedMeeting++;
                metricsMap.set(inv.invited_by, current);
              }
            }
          });
        }
      }

      // Buscar nomes dos membros
      const userIds = Array.from(metricsMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, company')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return Array.from(metricsMap.entries())
        .map(([userId, metrics]) => ({
          userId,
          profile: profilesMap.get(userId),
          ...metrics,
        }))
        .sort((a, b) => b.accepted - a.accepted);
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
    invitationMetrics,
  };
}
