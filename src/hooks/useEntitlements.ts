/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { hasPlanFeature, PATH_FEATURES, type Entitlements, type ModuleFeature } from '@/lib/plan-access';

export function useEntitlements() {
  const { user } = useAuth();
  const { role, isLoading: loadingRole } = useAdmin();
  const query = useQuery({
    queryKey: ['user-entitlements', user?.id],
    enabled: !!user?.id && !loadingRole,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('get_user_entitlements', { _user_id: user.id });
      if (error) throw error;
      return data as unknown as Entitlements;
    },
  });
  const can = (feature: ModuleFeature) => hasPlanFeature(role, feature, query.data);
  const canPath = (path: string) => !PATH_FEATURES[path] || can(PATH_FEATURES[path]);
  return { ...query, role, can, canPath, isLoading: loadingRole || query.isLoading };
}