/**
 * useProfilesCompleteness - Percentual de completude de vários perfis (somente o número).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProfilesCompleteness(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[])).sort();
  const { data } = useQuery({
    queryKey: ['profiles-completeness', unique],
    enabled: unique.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_profiles_completeness', { _ids: unique });
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach((r: { id: string; percent: number }) => map.set(r.id, r.percent));
      return map;
    },
  });
  return data ?? new Map<string, number>();
}
