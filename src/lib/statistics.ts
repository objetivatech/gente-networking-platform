import { format, startOfMonth, startOfYear, addMonths, addYears, subMonths } from 'date-fns';
import { parseLocalDate } from './date-utils';

export interface StatisticsSnapshot {
  profiles: { id: string; full_name: string; company: string | null; avatar_url: string | null; rank: string | null; points: number | null }[];
  teams: { id: string; name: string; color: string | null }[];
  teamMembers: { user_id: string; team_id: string }[];
  genteEmAcao: { id: string; user_id: string; meeting_date: string; meeting_type: string }[];
  deals: { id: string; closed_by_user_id: string; referred_by_user_id: string | null; value: number; deal_date: string }[];
  referrals: { id: string; from_user_id: string; to_user_id: string; created_at: string }[];
  testimonials: { id: string; from_user_id: string; to_user_id: string; created_at: string }[];
  councilReplies: { id: string; user_id: string; created_at: string }[];
  businessCases: { id: string; user_id: string; created_at: string }[];
  attendances: { id: string; user_id: string; meeting_id: string }[];
  meetings: { id: string; team_id: string | null; title: string; meeting_date: string }[];
}

/** Half-open calendar intervals; date-only events stay on their local calendar day. */
export function statisticsInRange(value: string, start: Date, end: Date) {
  const date = parseLocalDate(value);
  return date >= start && date < end;
}
const sum = (rows: { value: number }[]) => rows.reduce((total, row) => total + Number(row.value), 0);
export function summarizeStatistics(s: StatisticsSnapshot, ids = new Set(s.profiles.map(p => p.id))) {
  const ga = s.genteEmAcao.filter(r => ids.has(r.user_id));
  const deals = s.deals.filter(r => ids.has(r.closed_by_user_id));
  const referred = s.deals.filter(r => !!r.referred_by_user_id && ids.has(r.referred_by_user_id));
  const referralsSent = s.referrals.filter(r => ids.has(r.from_user_id));
  const referralsReceived = s.referrals.filter(r => ids.has(r.to_user_id));
  const testimonialsSent = s.testimonials.filter(r => ids.has(r.from_user_id));
  const testimonialsReceived = s.testimonials.filter(r => ids.has(r.to_user_id));
  return {
    genteEmAcao: { total: ga.length, withMembers: ga.filter(g => g.meeting_type === 'membro').length, withGuests: ga.filter(g => g.meeting_type === 'convidado').length },
    testimonials: { sent: testimonialsSent.length, received: testimonialsReceived.length },
    businessDeals: { total: deals.length, value: sum(deals), referred: referred.length, referredValue: sum(referred) },
    referrals: { sent: referralsSent.length, received: referralsReceived.length },
    attendances: new Set(s.attendances.filter(r => ids.has(r.user_id)).map(r => `${r.user_id}:${r.meeting_id}`)).size,
    councilReplies: s.councilReplies.filter(r => ids.has(r.user_id)).length,
    businessCases: s.businessCases.filter(r => ids.has(r.user_id)).length,
  };
}
export function statisticsForRange(s: StatisticsSnapshot, start: Date, end: Date): StatisticsSnapshot {
  const inRange = (date: string) => statisticsInRange(date, start, end);
  const meetingIds = new Set(s.meetings.filter(m => inRange(m.meeting_date)).map(m => m.id));
  return { ...s,
    genteEmAcao: s.genteEmAcao.filter(r => inRange(r.meeting_date)),
    deals: s.deals.filter(r => inRange(r.deal_date)),
    referrals: s.referrals.filter(r => inRange(r.created_at)),
    testimonials: s.testimonials.filter(r => inRange(r.created_at)),
    councilReplies: s.councilReplies.filter(r => inRange(r.created_at)),
    businessCases: s.businessCases.filter(r => inRange(r.created_at)),
    attendances: s.attendances.filter(r => meetingIds.has(r.meeting_id)),
  };
}
export function personalStatistics(s: StatisticsSnapshot, period: 'month' | 'year', now = new Date()) {
  const start = period === 'month' ? startOfMonth(now) : startOfYear(now);
  const end = period === 'month' ? addMonths(start, 1) : addYears(start, 1);
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const monthStart = startOfMonth(subMonths(now, 5 - i));
    const m = summarizeStatistics(statisticsForRange(s, monthStart, addMonths(monthStart, 1)));
    return { month: format(monthStart, 'MMM'), genteEmAcao: m.genteEmAcao.total, testimonials: m.testimonials.sent, negocios: m.businessDeals.total, indicacoes: m.referrals.sent, conselho: m.councilReplies, cases: m.businessCases };
  });
  return { ...summarizeStatistics(statisticsForRange(s, start, end)), monthlyData };
}
export function communityStatistics(s: StatisticsSnapshot, now = new Date()) {
  const total = summarizeStatistics(s);
  const rankDistribution = { iniciante: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 };
  s.profiles.forEach(p => { const rank = p.rank || 'iniciante'; if (rank in rankDistribution) rankDistribution[rank as keyof typeof rankDistribution]++; });
  const monthlyBreakdown = Array.from({ length: 6 }, (_, i) => {
    const start = startOfMonth(subMonths(now, 5 - i));
    const m = summarizeStatistics(statisticsForRange(s, start, addMonths(start, 1)));
    return { month: format(start, 'MMM/yy'), genteEmAcao: m.genteEmAcao.total, negocios: m.businessDeals.total, valorNegocios: m.businessDeals.value, indicacoesDadas: m.referrals.sent, indicacoesRecebidas: m.referrals.received, depoimentos: m.testimonials.sent, conselho: m.councilReplies, cases: m.businessCases };
  });
  const perTeam = s.teams.map(t => {
    const ids = new Set(s.teamMembers.filter(tm => tm.team_id === t.id).map(tm => tm.user_id));
    const m = summarizeStatistics(s, ids);
    return { ...t, memberCount: ids.size, genteEmAcao: m.genteEmAcao.total, negocios: m.businessDeals.total, valorNegocios: m.businessDeals.value, indicacoes: m.referrals.sent, depoimentos: m.testimonials.sent, conselho: m.councilReplies, cases: m.businessCases };
  });
  return { totalMembers: s.profiles.length, totalTeams: s.teams.length, totalDealsValue: total.businessDeals.value, totalDeals: total.businessDeals.total, totalTestimonials: total.testimonials.sent, totalGenteEmAcao: total.genteEmAcao.total, totalReferrals: total.referrals.sent, totalCouncilReplies: total.councilReplies, totalBusinessCases: total.businessCases, totalAttendances: total.attendances, rankDistribution, monthlyBreakdown, perTeam, teams: s.teams };
}
export function globalStatistics(s: StatisticsSnapshot) {
  return { teams: s.teams, userSummaries: s.profiles.map(p => {
    const m = summarizeStatistics(s, new Set([p.id]));
    return { ...p, points: p.points || 0, teams: s.teams.filter(t => s.teamMembers.some(tm => tm.user_id === p.id && tm.team_id === t.id)).map(t => t.name), genteEmAcao: m.genteEmAcao.total, negocios: m.businessDeals.total, valorNegocios: m.businessDeals.value, indicacoesDadas: m.referrals.sent, indicacoesRecebidas: m.referrals.received, depoimentosDados: m.testimonials.sent, depoimentosRecebidos: m.testimonials.received, conselhoRespostas: m.councilReplies, cases: m.businessCases, presencas: m.attendances };
  }).sort((a, b) => b.points - a.points) };
}
