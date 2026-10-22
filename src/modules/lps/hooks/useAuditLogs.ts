/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/modules/lps/lib/supabaseQuery';
import type { Database } from '@/integrations/supabase/types';
function mapAudit(row: Database['public']['Tables']['block_audit_logs']['Row']): AuditLog {
  return { id: row.id, block_id: row.block_id ?? '', landing_page_id: row.landing_page_id ?? '', user_id: row.changed_by,
    action: row.action === 'INSERT' ? 'create' : row.action === 'DELETE' ? 'delete' : 'update',
    old_values: row.old_data as Record<string, unknown> | null, new_values: row.new_data as Record<string, unknown> | null,
    changed_fields: row.changed_fields, created_at: row.created_at };
}

export interface AuditLog {
  id: string;
  block_id: string;
  landing_page_id: string;
  user_id: string | null;
  action: 'create' | 'update' | 'delete';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: string;
}

export function useAuditLogs(landingPageId?: string) {
  return useQuery({
    queryKey: ['lps', 'audit-logs', landingPageId],
    queryFn: async () => {
      let query = supabase
        .from('block_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (landingPageId) {
        query = query.eq('landing_page_id', landingPageId ?? '');
      }

      const result = await withTimeout(query, 10000);

      if (result.error) throw result.error;
      return (result.data ?? []).map(mapAudit);
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
  });
}

export function useBlockAuditLogs(blockId: string) {
  return useQuery({
    queryKey: ['lps', 'audit-logs', 'block', blockId],
    queryFn: async () => {
      const result = await withTimeout(
        supabase
          .from('block_audit_logs')
          .select('*')
          .eq('block_id', blockId)
          .order('created_at', { ascending: false }),
        10000
      );

      if (result.error) throw result.error;
      return (result.data ?? []).map(mapAudit);
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
    enabled: !!blockId,
  });
}
