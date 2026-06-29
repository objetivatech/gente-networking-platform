/**
 * @file useMemberHealthScores.ts
 * @description Hook que carrega o Health Score (índice de engajamento) por membro,
 * exclusivo para administradores. O score (0-100) é calculado no banco a partir de
 * sinais recentes (reuniões, indicações, presenças, depoimentos, conselho e cases),
 * sem interferir na pontuação/ranking de gamificação.
 * @copyright Ranktop / Gente Networking
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HealthLevel = 'saudavel' | 'atencao' | 'risco';

export interface MemberHealthScore {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  company: string | null;
  team_id: string | null;
  team_name: string | null;
  meetings_count: number;
  referrals_count: number;
  attendances_count: number;
  testimonials_count: number;
  council_count: number;
  business_cases_count: number;
  last_activity_at: string | null;
  health_score: number;
  health_level: HealthLevel;
}

export function useMemberHealthScores(days = 60, enabled = true) {
  return useQuery({
    queryKey: ['member-health-scores', days],
    enabled,
    queryFn: async (): Promise<MemberHealthScore[]> => {
      const { data, error } = await supabase.rpc('get_members_health_scores', { _days: days });
      if (error) throw error;
      return (data || []) as MemberHealthScore[];
    },
  });
}
