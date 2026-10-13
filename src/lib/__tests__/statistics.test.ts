import { describe, expect, it } from 'vitest';
import { communityStatistics, globalStatistics, personalStatistics, statisticsInRange, type StatisticsSnapshot } from '../statistics';
const fixture = (): StatisticsSnapshot => ({
 profiles: [{ id: 'a', full_name: 'A', company: null, avatar_url: null, rank: 'bronze', points: 0 }],
 teams: [{ id: 't', name: 'T', color: null }], teamMembers: [{ team_id: 't', user_id: 'a' }],
 genteEmAcao: [{ id: 'g', user_id: 'a', meeting_date: '2026-10-01', meeting_type: 'membro' }],
 deals: [{ id: 'd', closed_by_user_id: 'outside', referred_by_user_id: 'a', value: 100, deal_date: '2026-10-01' }],
 referrals: [{ id: 'r', from_user_id: 'outside', to_user_id: 'a', created_at: '2026-10-01T12:00:00Z' }], testimonials: [], councilReplies: [], businessCases: [],
 attendances: [{ id: '1', user_id: 'a', meeting_id: 'm' }, { id: '2', user_id: 'a', meeting_id: 'm' }], meetings: [{ id: 'm', team_id: 't', title: 'M', meeting_date: '2026-09-01' }],
});
describe('Canonical statistics', () => {
 it('separates received referrals and referred deals from authored totals', () => {
  const c = communityStatistics(fixture(), new Date(2026, 9, 10));
  expect(c.totalReferrals).toBe(0); expect(c.totalDeals).toBe(0);
  expect(c.monthlyBreakdown.at(-1)?.indicacoesRecebidas).toBe(1);
  const p = personalStatistics(fixture(), 'month', new Date(2026, 9, 10));
  expect(p.referrals.received).toBe(1); expect(p.businessDeals.referredValue).toBe(100);
 });
 it('applies month and year to attendance using meeting date and deduplicates', () => {
  expect(personalStatistics(fixture(), 'month', new Date(2026, 9, 10)).attendances).toBe(0);
  expect(personalStatistics(fixture(), 'year', new Date(2026, 9, 10)).attendances).toBe(1);
 });
 it('empty population never falls back to all activities', () => {
  const s = fixture(); s.profiles = []; s.teamMembers = [];
  expect(communityStatistics(s).totalGenteEmAcao).toBe(0);
  expect(communityStatistics(s).perTeam[0].memberCount).toBe(0);
 });
 it('global report sums match community authored totals', () => {
  const s = fixture(); const c = communityStatistics(s); const g = globalStatistics(s);
  expect(g.userSummaries.reduce((n, u) => n + u.genteEmAcao, 0)).toBe(c.totalGenteEmAcao);
  expect(g.userSummaries.reduce((n, u) => n + u.presencas, 0)).toBe(c.totalAttendances);
 });
 it('date-only boundaries include first day and exclude next month', () => {
  expect(statisticsInRange('2026-10-01', new Date(2026, 9, 1), new Date(2026, 10, 1))).toBe(true);
  expect(statisticsInRange('2026-11-01', new Date(2026, 9, 1), new Date(2026, 10, 1))).toBe(false);
 });
});
