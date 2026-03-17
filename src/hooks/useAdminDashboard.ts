import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, startOfYear, endOfYear } from 'date-fns';

export function useAdminDashboard(teamId?: string) {
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
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
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

      // Annual business value
      const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(new Date()), 'yyyy-MM-dd');
      const { data: yearDeals } = await supabase
        .from('business_deals')
        .select('value')
        .gte('deal_date', yearStart)
        .lte('deal_date', yearEnd);
      const annualBusinessValue = yearDeals?.reduce((acc, d) => acc + Number(d.value), 0) || 0;

      return {
        totalMembers: totalMembers || 0,
        totalTeams: totalTeams || 0,
        totalBusinessValue,
        annualBusinessValue,
        totalTestimonials: totalTestimonials || 0,
        totalReferrals: totalReferrals || 0,
        totalGenteEmAcao: totalGenteEmAcao || 0,
        totalInvitations: totalInvitations || 0,
        acceptedInvitations,
      };
    },
  });

  // KPIs de presença
  const { data: attendanceKpis } = useQuery({
    queryKey: ['admin-attendance-kpis'],
    queryFn: async () => {
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, team_id, title, meeting_date')
        .order('meeting_date', { ascending: false })
        .limit(50);

      if (!meetings || meetings.length === 0) return { overall: 0, byMeeting: [] };

      const { count: totalActiveMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { data: attendances } = await supabase
        .from('attendances')
        .select('meeting_id, user_id')
        .in('meeting_id', meetings.map(m => m.id));

      const attendanceByMeeting = new Map<string, number>();
      attendances?.forEach(a => {
        attendanceByMeeting.set(a.meeting_id, (attendanceByMeeting.get(a.meeting_id) || 0) + 1);
      });

      const byMeeting = meetings.slice(0, 10).map(m => ({
        id: m.id,
        title: m.title,
        date: m.meeting_date,
        teamId: m.team_id,
        attendees: attendanceByMeeting.get(m.id) || 0,
        percentage: totalActiveMembers ? Math.round(((attendanceByMeeting.get(m.id) || 0) / totalActiveMembers) * 100) : 0,
      }));

      const totalAttendances = attendances?.length || 0;
      const overall = meetings.length > 0 && totalActiveMembers
        ? Math.round((totalAttendances / (meetings.length * totalActiveMembers)) * 100)
        : 0;

      return { overall, byMeeting };
    },
  });

  // KPIs por grupo
  const { data: teamKpis } = useQuery({
    queryKey: ['admin-team-kpis'],
    queryFn: async () => {
      const { data: teams } = await supabase.from('teams').select('id, name, color');
      if (!teams) return [];

      const { data: teamMembers } = await supabase.from('team_members').select('team_id, user_id');
      const { data: allGente } = await supabase.from('gente_em_acao').select('user_id');
      const { data: allReferrals } = await supabase.from('referrals').select('from_user_id, to_user_id');
      const { data: allDeals } = await supabase.from('business_deals').select('closed_by_user_id, value');
      const { data: allTestimonials } = await supabase.from('testimonials').select('from_user_id');

      const membersByTeam = new Map<string, Set<string>>();
      teamMembers?.forEach(tm => {
        if (!membersByTeam.has(tm.team_id)) membersByTeam.set(tm.team_id, new Set());
        membersByTeam.get(tm.team_id)!.add(tm.user_id);
      });

      return teams.map(team => {
        const members = membersByTeam.get(team.id) || new Set();
        const genteCount = allGente?.filter(g => members.has(g.user_id)).length || 0;
        const referralCount = allReferrals?.filter(r => members.has(r.from_user_id)).length || 0;
        const dealsValue = allDeals?.filter(d => members.has(d.closed_by_user_id)).reduce((acc, d) => acc + Number(d.value), 0) || 0;
        const testimonialCount = allTestimonials?.filter(t => members.has(t.from_user_id)).length || 0;

        return {
          id: team.id,
          name: team.name,
          color: team.color,
          memberCount: members.size,
          genteEmAcao: genteCount,
          referrals: referralCount,
          businessValue: dealsValue,
          testimonials: testimonialCount,
        };
      });
    },
  });

  // Distribuição por rank
  const { data: rankDistribution } = useQuery({
    queryKey: ['admin-rank-distribution'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('rank');
      const distribution = { iniciante: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 };
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
          supabase.from('gente_em_acao').select('*', { count: 'exact', head: true })
            .gte('meeting_date', format(start, 'yyyy-MM-dd')).lte('meeting_date', format(end, 'yyyy-MM-dd')),
          supabase.from('testimonials').select('*', { count: 'exact', head: true })
            .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
          supabase.from('referrals').select('*', { count: 'exact', head: true })
            .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
          supabase.from('business_deals').select('value')
            .gte('deal_date', format(start, 'yyyy-MM-dd')).lte('deal_date', format(end, 'yyyy-MM-dd')),
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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Métricas de convites por membro
  const { data: invitationMetrics } = useQuery({
    queryKey: ['admin-invitation-metrics'],
    queryFn: async () => {
      const { data: invitations } = await supabase
        .from('invitations')
        .select('invited_by, status, accepted_by');
      if (!invitations) return [];

      const metricsMap = new Map<string, { invited: number; accepted: number; attendedMeeting: number }>();
      invitations.forEach(inv => {
        const current = metricsMap.get(inv.invited_by) || { invited: 0, accepted: 0, attendedMeeting: 0 };
        current.invited++;
        if (inv.status === 'accepted') current.accepted++;
        metricsMap.set(inv.invited_by, current);
      });

      const acceptedInvitations = invitations.filter(i => i.status === 'accepted' && i.accepted_by);
      const acceptedUserIds = acceptedInvitations.map(i => i.accepted_by).filter(Boolean);

      if (acceptedUserIds.length > 0) {
        const { data: attendances } = await supabase
          .from('attendances').select('user_id').in('user_id', acceptedUserIds as string[]);
        if (attendances) {
          const attendedUserIds = new Set(attendances.map(a => a.user_id));
          acceptedInvitations.forEach(inv => {
            if (inv.accepted_by && attendedUserIds.has(inv.accepted_by)) {
              const current = metricsMap.get(inv.invited_by);
              if (current) { current.attendedMeeting++; metricsMap.set(inv.invited_by, current); }
            }
          });
        }
      }

      const userIds = Array.from(metricsMap.keys());
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name, avatar_url, company').in('id', userIds);
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return Array.from(metricsMap.entries())
        .map(([userId, metrics]) => ({ userId, profile: profilesMap.get(userId), ...metrics }))
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
    attendanceKpis,
    teamKpis,
  };
}
