/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ConnectionDoors, ConnectionTaxonomy } from '@/lib/connection-doors';

export function useConnectionTaxonomies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['connection-taxonomies', user?.id], enabled: !!user?.id,
    queryFn: async (): Promise<ConnectionTaxonomy[]> => {
      const all: ConnectionTaxonomy[] = [];
      for (let from = 0; ; from += 500) {
        const { data, error } = await supabase.from('matchmaking_taxonomies').select('*')
          .order('sort_order').order('id').range(from, from + 499);
        if (error) throw error;
        all.push(...(data ?? []) as ConnectionTaxonomy[]);
        if ((data ?? []).length < 500) break;
      }
      return all;
    },
  });
}

export async function fetchConnectionDoors(ids: string[]): Promise<Map<string, ConnectionDoors>> {
  const unique = [...new Set(ids)].sort();
  const result = new Map<string, ConnectionDoors>();
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await supabase.rpc('get_profile_connection_doors', { _ids: unique.slice(i, i + 200) });
    if (error) throw error;
    data?.forEach((row) => result.set(row.id, row));
  }
  return result;
}

export function useConnectionDoors(ids: string[]) {
  const { user } = useAuth();
  const unique = [...new Set(ids)].sort();
  const query = useQuery({
    queryKey: ['connection-doors', user?.id, unique], enabled: !!user?.id && unique.length > 0,
    queryFn: () => fetchConnectionDoors(unique),
  });
  return query.data ?? new Map<string, ConnectionDoors>();
}