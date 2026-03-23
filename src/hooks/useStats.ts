import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

export interface Stats {
  genteEmAcao: { total: number; withMembers: number; withGuests: number };
  testimonials: { sent: number; received: number };
  businessDeals: { total: number; value: number; referred: number; referredValue: number };
  referrals: { sent: number; received: number };
  attendances: number;
  councilReplies: number;
  businessCases: number;
  monthlyData: { month: string; genteEmAcao: number; testimonials: number; negocios: number; indicacoes: number; conselho: number; cases: number }[];
}

export function useStats(period: 'month' | 'year' = 'month') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stats', user?.id, period],
    queryFn: async () => {
      if (!user?.id) return null;
      const now = new Date();

      const [genteEmAcao, testimonialsSent, testimonialsReceived, myDeals, referredDeals, sentReferrals, receivedReferrals, attendances, councilReplies, businessCases] = await Promise.all([
        supabase.from('gente_em_acao').select('id, meeting_type, meeting_date').eq('user_id', user.id),
        supabase.from('testimonials').select('id, created_at').eq('from_user_id', user.id),
        supabase.from('testimonials').select('id').eq('to_user_id', user.id),
        supabase.from('business_deals').select('id, value, deal_date').eq('closed_by_user_id', user.id),
        supabase.from('business_deals').select('id, value').eq('referred_by_user_id', user.id),
        supabase.from('referrals').select('id, created_at').eq('from_user_id', user.id),
        supabase.from('referrals').select('id').eq('to_user_id', user.id),
        supabase.from('attendances').select('id').eq('user_id', user.id),
        supabase.from('council_replies').select('id, created_at').eq('user_id', user.id),
        supabase.from('business_cases').select('id, created_at').eq('user_id', user.id),
      ]);

      const ga = genteEmAcao.data || [];
      const deals = myDeals.data || [];
      const refDeals = referredDeals.data || [];
      const cr = councilReplies.data || [];
      const bc = businessCases.data || [];

      const months: Stats['monthlyData'] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = format(d, 'MMM');
        const monthStart = startOfMonth(d);
        const monthEnd = endOfMonth(d);
        const inRange = (dateStr: string) => { const dt = new Date(dateStr); return dt >= monthStart && dt <= monthEnd; };

        months.push({
          month: monthStr,
          genteEmAcao: ga.filter(g => inRange(g.meeting_date)).length,
          testimonials: (testimonialsSent.data || []).filter(t => inRange(t.created_at)).length,
          negocios: deals.filter(d => inRange(d.deal_date)).length,
          indicacoes: (sentReferrals.data || []).filter(r => inRange(r.created_at)).length,
          conselho: cr.filter(c => inRange(c.created_at)).length,
          cases: bc.filter(b => inRange(b.created_at)).length,
        });
      }

      return {
        genteEmAcao: { total: ga.length, withMembers: ga.filter(g => g.meeting_type === 'membro').length, withGuests: ga.filter(g => g.meeting_type === 'convidado').length },
        testimonials: { sent: testimonialsSent.data?.length || 0, received: testimonialsReceived.data?.length || 0 },
        businessDeals: { total: deals.length, value: deals.reduce((s, d) => s + Number(d.value), 0), referred: refDeals.length, referredValue: refDeals.reduce((s, d) => s + Number(d.value), 0) },
        referrals: { sent: sentReferrals.data?.length || 0, received: receivedReferrals.data?.length || 0 },
        attendances: attendances.data?.length || 0,
        councilReplies: cr.length,
        businessCases: bc.length,
        monthlyData: months,
      } as Stats;
    },
    enabled: !!user?.id,
  });
}

export function useCommunityStats(teamId?: string) {
  return useQuery({
    queryKey: ['community-stats', teamId || 'all'],
    queryFn: async () => {
      // Base queries - optionally filter by team, only count valid members
      const [teamsRes, allTeamMembers, validRolesRes] = await Promise.all([
        supabase.from('teams').select('id, name, color'),
        supabase.from('team_members').select('user_id, team_id, is_facilitator'),
        supabase.from('user_roles').select('user_id').in('role', ['membro', 'facilitador']),
      ]);
      const teams = teamsRes.data || [];
      const teamMembers = allTeamMembers.data || [];
      const validMemberIds = new Set((validRolesRes.data || []).map(r => r.user_id));

      // Get member IDs for the selected team (or all valid members)
      const relevantMembers = teamId
        ? teamMembers.filter(tm => tm.team_id === teamId && validMemberIds.has(tm.user_id)).map(tm => tm.user_id)
        : Array.from(validMemberIds);

      const filterByMembers = (query: any, col: string) => {
        if (relevantMembers && relevantMembers.length > 0) return query.in(col, relevantMembers);
        return query;
      };

      const [profiles, deals, testimonials, genteEmAcao, referrals, councilReplies, businessCases, attendances, meetings] = await Promise.all([
        filterByMembers(supabase.from('profiles').select('id, rank').eq('is_active', true), 'id'),
        filterByMembers(supabase.from('business_deals').select('value, deal_date, closed_by_user_id'), 'closed_by_user_id'),
        filterByMembers(supabase.from('testimonials').select('id, created_at, from_user_id'), 'from_user_id'),
        filterByMembers(supabase.from('gente_em_acao').select('id, meeting_date, user_id'), 'user_id'),
        filterByMembers(supabase.from('referrals').select('id, created_at, from_user_id, to_user_id'), 'from_user_id'),
        filterByMembers(supabase.from('council_replies').select('id, created_at'), 'user_id'),
        filterByMembers(supabase.from('business_cases').select('id, created_at'), 'user_id'),
        supabase.from('attendances').select('id, user_id, meeting_id'),
        supabase.from('meetings').select('id, team_id, meeting_date'),
      ]);

      const profilesData = profiles.data || [];
      const dealsData = deals.data || [];
      const referralsData = referrals.data || [];
      const gaData = genteEmAcao.data || [];
      const meetingsData = meetings.data || [];
      const attendancesData = attendances.data || [];

      // Filter attendances by team if needed
      let filteredAttendances = attendancesData;
      if (teamId) {
        const teamMeetingIds = meetingsData.filter(m => m.team_id === teamId).map(m => m.id);
        filteredAttendances = attendancesData.filter(a => teamMeetingIds.includes(a.meeting_id) || (relevantMembers && relevantMembers.includes(a.user_id)));
      }

      const rankCounts = { iniciante: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 };
      profilesData.forEach(p => { if (p.rank) rankCounts[p.rank as keyof typeof rankCounts]++; });

      // Monthly breakdown (last 6 months)
      const now = new Date();
      const monthlyBreakdown: { month: string; genteEmAcao: number; negocios: number; indicacoesDadas: number; indicacoesRecebidas: number; depoimentos: number; conselho: number; cases: number; valorNegocios: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const monthStart = startOfMonth(d);
        const monthEnd = endOfMonth(d);
        const inRange = (dateStr: string) => { const dt = new Date(dateStr); return dt >= monthStart && dt <= monthEnd; };
        const monthLabel = format(d, 'MMM/yy');

        const monthDeals = dealsData.filter(dl => inRange(dl.deal_date));
        monthlyBreakdown.push({
          month: monthLabel,
          genteEmAcao: gaData.filter(g => inRange(g.meeting_date)).length,
          negocios: monthDeals.length,
          valorNegocios: monthDeals.reduce((s, dl) => s + Number(dl.value), 0),
          indicacoesDadas: referralsData.filter(r => inRange(r.created_at)).length,
          indicacoesRecebidas: (referrals.data || []).filter(r => inRange(r.created_at)).length,
          depoimentos: (testimonials.data || []).filter(t => inRange(t.created_at)).length,
          conselho: (councilReplies.data || []).filter(c => inRange(c.created_at)).length,
          cases: (businessCases.data || []).filter(b => inRange(b.created_at)).length,
        });
      }

      // Per-team breakdown
      const perTeam = teams.map(team => {
        const members = teamMembers.filter(tm => tm.team_id === team.id && validMemberIds.has(tm.user_id)).map(tm => tm.user_id);
        return {
          id: team.id,
          name: team.name,
          color: team.color,
          memberCount: members.length,
          genteEmAcao: gaData.filter(g => members.includes(g.user_id)).length,
          negocios: dealsData.filter(d => members.includes((d as any).closed_by_user_id)).length,
          valorNegocios: dealsData.filter(d => members.includes((d as any).closed_by_user_id)).reduce((s, d) => s + Number(d.value), 0),
          indicacoes: referralsData.filter(r => members.includes(r.from_user_id)).length,
          depoimentos: (testimonials.data || []).filter(t => members.includes((t as any).from_user_id)).length,
        };
      });

      return {
        totalMembers: profilesData.length,
        totalTeams: teams.length,
        totalDealsValue: dealsData.reduce((s, d) => s + Number(d.value), 0),
        totalDeals: dealsData.length,
        totalTestimonials: testimonials.data?.length || 0,
        totalGenteEmAcao: gaData.length,
        totalReferrals: referralsData.length,
        totalCouncilReplies: councilReplies.data?.length || 0,
        totalBusinessCases: businessCases.data?.length || 0,
        totalAttendances: filteredAttendances.length,
        rankDistribution: Object.entries(rankCounts).map(([name, value]) => ({ name, value })),
        monthlyBreakdown,
        perTeam,
        teams,
      };
    },
  });
}

export function useAdminGlobalStats() {
  return useQuery({
    queryKey: ['admin-global-stats'],
    queryFn: async () => {
      const [allGA, allDeals, allReferrals, allTestimonials, allCouncil, allCases, allAttendances, allProfiles, allTeams, allTeamMembers] = await Promise.all([
        supabase.from('gente_em_acao').select('id, user_id, meeting_date, meeting_type'),
        supabase.from('business_deals').select('id, closed_by_user_id, value, deal_date'),
        supabase.from('referrals').select('id, from_user_id, to_user_id, created_at'),
        supabase.from('testimonials').select('id, from_user_id, to_user_id, created_at'),
        supabase.from('council_replies').select('id, user_id, created_at'),
        supabase.from('business_cases').select('id, user_id, created_at'),
        supabase.from('attendances').select('id, user_id, meeting_id'),
        supabase.from('profiles').select('id, full_name, points, rank, company, avatar_url'),
        supabase.from('teams').select('id, name, color'),
        supabase.from('team_members').select('user_id, team_id'),
      ]);

      const teams = allTeams.data || [];
      const teamMembers = allTeamMembers.data || [];
      const profiles = allProfiles.data || [];

      // Per-user summary
      const userSummaries = profiles.map(p => {
        const userTeams = teamMembers.filter(tm => tm.user_id === p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          company: p.company,
          avatar_url: p.avatar_url,
          points: p.points || 0,
          rank: p.rank,
          teams: userTeams.map(ut => teams.find(t => t.id === ut.team_id)?.name || '').filter(Boolean),
          genteEmAcao: (allGA.data || []).filter(g => g.user_id === p.id).length,
          negocios: (allDeals.data || []).filter(d => d.closed_by_user_id === p.id).length,
          valorNegocios: (allDeals.data || []).filter(d => d.closed_by_user_id === p.id).reduce((s, d) => s + Number(d.value), 0),
          indicacoesDadas: (allReferrals.data || []).filter(r => r.from_user_id === p.id).length,
          indicacoesRecebidas: (allReferrals.data || []).filter(r => r.to_user_id === p.id).length,
          depoimentosDados: (allTestimonials.data || []).filter(t => t.from_user_id === p.id).length,
          depoimentosRecebidos: (allTestimonials.data || []).filter(t => t.to_user_id === p.id).length,
          conselhoRespostas: (allCouncil.data || []).filter(c => c.user_id === p.id).length,
          cases: (allCases.data || []).filter(c => c.user_id === p.id).length,
          presencas: (allAttendances.data || []).filter(a => a.user_id === p.id).length,
        };
      });

      return {
        userSummaries: userSummaries.sort((a, b) => b.points - a.points),
        teams,
      };
    },
  });
}
