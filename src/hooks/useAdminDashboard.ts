import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, addYears, startOfDay, addDays, subDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { fetchStatisticsSnapshot } from './useStats';
import { communityStatistics, statisticsForRange, statisticsInRange } from '@/lib/statistics';

export function useAdminDashboard(teamId?: string) {
  const { user } = useAuth();
  const { canManage } = useAdmin();
  const snapshotQuery = useQuery({
    queryKey: ['admin-dashboard-snapshot', user?.id, teamId || 'all'],
    queryFn: () => fetchStatisticsSnapshot('admin', teamId),
    enabled: !!user?.id && canManage,
    refetchOnWindowFocus: true,
  });
  const snapshot = snapshotQuery.data;
  const community = snapshot ? communityStatistics(snapshot) : undefined;
  const { data: stats, isLoading: loadingExtras, error: extrasError } = useQuery({
    queryKey: ['admin-dashboard-stats', user?.id, teamId || 'all', snapshot],
    enabled: !!snapshot,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!snapshot || !community) throw new Error('Indicadores indisponíveis');
      const [invitationsResult, guestRolesResult] = await Promise.all([
        supabase.from('invitations').select('status, expires_at, team_id'),
        supabase.from('user_roles').select('user_id').eq('role', 'convidado'),
      ]);
      if (invitationsResult.error) throw invitationsResult.error;
      if (guestRolesResult.error) throw guestRolesResult.error;
      const guestIds = [...new Set(guestRolesResult.data.map(r => r.user_id))];
      const guestsResult = guestIds.length ? await supabase.from('profiles').select('id').in('id', guestIds).eq('is_active', true) : { data: [], error: null };
      if (guestsResult.error) throw guestsResult.error;
      let guestCount = guestsResult.data?.length || 0;
      if (teamId) {
        const memberships = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
        if (memberships.error) throw memberships.error;
        const ids = new Set(memberships.data.map(r => r.user_id));
        guestCount = (guestsResult.data || []).filter(p => ids.has(p.id)).length;
      }
      const invitations = invitationsResult.data.filter(i => !teamId || i.team_id === teamId);
      const now = new Date();
      const yearStart = startOfYear(now);
      const annual = communityStatistics(statisticsForRange(snapshot, yearStart, addYears(yearStart, 1)));
      const memberIds = new Set(snapshot.profiles.map(p => p.id));
      const recentDeals = snapshot.deals.filter(d => memberIds.has(d.closed_by_user_id) && statisticsInRange(d.deal_date, startOfDay(subDays(now, 30)), addDays(startOfDay(now), 1)));
      return {
        totalMembers: community.totalMembers, totalGuests: guestCount,
        pendingInvitations: invitations.filter(i => i.status === 'pending' && new Date(i.expires_at) > now).length,
        expiredInvitations: invitations.filter(i => i.status === 'pending' && new Date(i.expires_at) <= now).length,
        totalTeams: community.totalTeams, totalBusinessValue: community.totalDealsValue,
        annualBusinessValue: annual.totalDealsValue,
        last30BusinessValue: recentDeals.reduce((sum, d) => sum + Number(d.value), 0),
        last30DealsCount: recentDeals.length, convertedReferrals: recentDeals.filter(d => !!d.referred_by_user_id).length,
        totalTestimonials: community.totalTestimonials, totalReferrals: community.totalReferrals,
        totalGenteEmAcao: community.totalGenteEmAcao, totalInvitations: invitations.length,
        acceptedInvitations: invitations.filter(i => i.status === 'accepted').length,
        totalCouncilReplies: community.totalCouncilReplies, totalBusinessCases: community.totalBusinessCases,
      };
    },
  });
  // Attendance is an operational rate using current active membership, not historical enrollment.
  const pastMeetings = snapshot?.meetings.filter(m => new Date(m.meeting_date) <= new Date()).sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)).slice(0, 50) || [];
  const byMeeting = pastMeetings.map(m => {
    const eligible = new Set(m.team_id ? snapshot!.teamMembers.filter(tm => tm.team_id === m.team_id).map(tm => tm.user_id) : snapshot!.profiles.map(p => p.id));
    const attendees = new Set(snapshot!.attendances.filter(a => a.meeting_id === m.id && eligible.has(a.user_id)).map(a => a.user_id)).size;
    return { id: m.id, title: m.title, date: m.meeting_date, teamId: m.team_id, attendees, eligible: eligible.size, percentage: eligible.size ? Math.round(attendees / eligible.size * 100) : 0 };
  });
  const eligibleTotal = byMeeting.reduce((sum, m) => sum + m.eligible, 0);
  const attendanceKpis = { overall: eligibleTotal ? Math.round(byMeeting.reduce((sum, m) => sum + m.attendees, 0) / eligibleTotal * 100) : 0, byMeeting: byMeeting.slice(0, 10) };
  const teamKpis = community?.perTeam.map(t => ({ ...t, referrals: t.indicacoes, businessValue: t.valorNegocios, businessCount: t.negocios, testimonials: t.depoimentos, councilReplies: t.conselho, businessCases: t.cases }));
  const rankDistribution = community ? Object.entries(community.rankDistribution).map(([name, value]) => ({ name, value })) : undefined;
  const monthlyActivity = community?.monthlyBreakdown.map(m => ({ month: m.month, genteEmAcao: m.genteEmAcao, depoimentos: m.depoimentos, indicacoes: m.indicacoesDadas, negocios: m.valorNegocios }));
  // Competitive leaderboard deliberately excludes Facilitators (existing gamification rule).
  const { data: topMembers } = useQuery({
    queryKey: ['admin-top-members', user?.id, teamId || 'all', snapshot], enabled: !!snapshot,
    queryFn: async () => {
      const result = await supabase.from('user_roles').select('user_id').eq('role', 'facilitador');
      if (result.error) throw result.error;
      const excluded = new Set(result.data.map(r => r.user_id));
      return snapshot!.profiles.filter(p => !excluded.has(p.id)).sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
    },
  });
  const loadingStats = snapshotQuery.isLoading || loadingExtras;
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
    error: snapshotQuery.error || extrasError,
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
