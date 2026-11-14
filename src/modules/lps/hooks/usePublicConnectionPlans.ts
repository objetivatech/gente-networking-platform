/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlanBadgeData } from '@/lib/plan-commercial';

export type PublicConnectionPlan = { id: string; name: string; description: string | null; amount_cents: number; features: Record<string, unknown>; badge_label: string | null; badge_tone: PlanBadgeData['tone']; remaining_seats: number | null; trial_enabled: boolean; trial_days: number };

export function usePublicConnectionPlans() {
  return useQuery({
    queryKey: ['self-service-plans'],
    queryFn: async (): Promise<PublicConnectionPlan[]> => {
      const { data, error } = await supabase.functions.invoke('subscriber-checkout', { body: { action: 'plans' } });
      if (error || data?.error || !Array.isArray(data?.plans)) throw new Error('Não foi possível consultar os planos.');
      return data.plans;
    },
    staleTime: 60_000,
    retry: false,
  });
}