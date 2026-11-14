/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { PlanBadgeData } from '@/lib/plan-commercial';
export function usePlanBadges(ids: string[]) {
 const { user } = useAuth();
 const unique = [...new Set(ids)].sort();
 const { data } = useQuery({ queryKey: ['plan-badges', user?.id, unique], enabled: !!user && unique.length > 0, staleTime: 60_000, queryFn: async () => {
 const { data, error } = await supabase.functions.invoke('subscriber-checkout', { body: { action: 'badges', ids: unique } });
 if (error) throw error;
 return data.badges as Record<string, PlanBadgeData>;
 } });
 return data ?? {};
}
