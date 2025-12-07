import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export interface Stats {
  genteEmAcao: { total: number; withMembers: number; withGuests: number };
  testimonials: { sent: number; received: number };
  businessDeals: { total: number; value: number; referred: number; referredValue: number };
  referrals: { sent: number; received: number };
  attendances: number;
  monthlyData: { month: string; genteEmAcao: number; testimonials: number; negocios: number; indicacoes: number }[];
}

export function useStats(period: 'month' | 'year' = 'month') {
  const { user } = useAuth();
  const now = new Date();
  const start = period === 'month' ? startOfMonth(now) : startOfYear(now);
  const end = period === 'month' ? endOfMonth(now) : endOfYear(now);

  return useQuery({
    queryKey: ['stats', user?.id, period],
    queryFn: async () => {
      if (!user?.id) return null;

      const [genteEmAcao, testimonialsSent, testimonialsReceived, myDeals, referredDeals, sentReferrals, receivedReferrals, attendances] = await Promise.all([
        supabase.from('gente_em_acao').select('id, meeting_type, meeting_date').eq('user_id', user.id),
        supabase.from('testimonials').select('id, created_at').eq('from_user_id', user.id),
        supabase.from('testimonials').select('id').eq('to_user_id', user.id),
        supabase.from('business_deals').select('id, value, deal_date').eq('closed_by_user_id', user.id),
        supabase.from('business_deals').select('id, value').eq('referred_by_user_id', user.id),
        supabase.from('referrals').select('id, created_at').eq('from_user_id', user.id),
        supabase.from('referrals').select('id').eq('to_user_id', user.id),
        supabase.from('attendances').select('id').eq('user_id', user.id),
      ]);

      const ga = genteEmAcao.data || [];
      const deals = myDeals.data || [];
      const refDeals = referredDeals.data || [];

      // Monthly data for charts (last 6 months)
      const months: { month: string; genteEmAcao: number; testimonials: number; negocios: number; indicacoes: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = format(d, 'MMM');
        const monthStart = startOfMonth(d);
        const monthEnd = endOfMonth(d);
        
        months.push({
          month: monthStr,
          genteEmAcao: ga.filter(g => { const date = new Date(g.meeting_date); return date >= monthStart && date <= monthEnd; }).length,
          testimonials: (testimonialsSent.data || []).filter(t => { const date = new Date(t.created_at); return date >= monthStart && date <= monthEnd; }).length,
          negocios: deals.filter(d => { const date = new Date(d.deal_date); return date >= monthStart && date <= monthEnd; }).length,
          indicacoes: (sentReferrals.data || []).filter(r => { const date = new Date(r.created_at); return date >= monthStart && date <= monthEnd; }).length,
        });
      }

      return {
        genteEmAcao: {
          total: ga.length,
          withMembers: ga.filter(g => g.meeting_type === 'membro').length,
          withGuests: ga.filter(g => g.meeting_type === 'convidado').length,
        },
        testimonials: { sent: testimonialsSent.data?.length || 0, received: testimonialsReceived.data?.length || 0 },
        businessDeals: {
          total: deals.length,
          value: deals.reduce((sum, d) => sum + Number(d.value), 0),
          referred: refDeals.length,
          referredValue: refDeals.reduce((sum, d) => sum + Number(d.value), 0),
        },
        referrals: { sent: sentReferrals.data?.length || 0, received: receivedReferrals.data?.length || 0 },
        attendances: attendances.data?.length || 0,
        monthlyData: months,
      } as Stats;
    },
    enabled: !!user?.id,
  });
}

export function useCommunityStats() {
  return useQuery({
    queryKey: ['community-stats'],
    queryFn: async () => {
      const [members, teams, deals, testimonials, genteEmAcao] = await Promise.all([
        supabase.from('profiles').select('id, rank'),
        supabase.from('teams').select('id'),
        supabase.from('business_deals').select('value'),
        supabase.from('testimonials').select('id'),
        supabase.from('gente_em_acao').select('id'),
      ]);

      const profiles = members.data || [];
      const rankCounts = { iniciante: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 };
      profiles.forEach(p => { if (p.rank) rankCounts[p.rank as keyof typeof rankCounts]++; });

      return {
        totalMembers: profiles.length,
        totalTeams: teams.data?.length || 0,
        totalDealsValue: (deals.data || []).reduce((sum, d) => sum + Number(d.value), 0),
        totalTestimonials: testimonials.data?.length || 0,
        totalGenteEmAcao: genteEmAcao.data?.length || 0,
        rankDistribution: Object.entries(rankCounts).map(([name, value]) => ({ name, value })),
      };
    },
  });
}
