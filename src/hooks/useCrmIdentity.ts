/**
 * useCrmIdentity - Métricas e trilha de identidade única do CRM (v3.47.0).
 *
 * - Bloqueios na origem (`already_member_blocked`) gravados em `crm_identity_events`.
 * - Fusões automáticas de contatos (`lead_merged`) gravadas em `crm_lead_history`.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IdentityBlockEvent {
  id: string;
  event_type: string;
  email: string | null;
  phone_digits: string | null;
  matched_profile_id: string | null;
  source: string | null;
  page_key: string | null;
  page_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface LeadMergeEvent {
  id: string;
  created_at: string;
  reason: string | null;
  moved_by: string | null;
  moved_by_name: string | null;
  keep: { id: string; name: string; email: string; phone: string | null } | null;
  merged_lead_id: string | null;
  merged_email: string | null;
  merged_phone: string | null;
  merged_archived: boolean;
}

/** Bloqueios na origem (LP avisou que a pessoa já é membro). */
export function useIdentityBlocks(limit = 300) {
  return useQuery({
    queryKey: ['crm-identity-blocks', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_identity_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as IdentityBlockEvent[];
    },
  });
}

/** Fusões automáticas de contatos duplicados. */
export function useLeadMerges(limit = 300) {
  return useQuery({
    queryKey: ['crm-lead-merges', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_history')
        .select('*')
        .eq('event_type', 'lead_merged')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      const rows = (data ?? []) as unknown as {
        id: string;
        lead_id: string;
        moved_by: string | null;
        reason: string | null;
        created_at: string;
        metadata: Record<string, unknown> | null;
      }[];

      const keepIds = Array.from(new Set(rows.map((r) => r.lead_id)));
      const dupIds = Array.from(
        new Set(
          rows
            .map((r) => r.metadata?.['merged_lead_id'])
            .filter((v): v is string => typeof v === 'string'),
        ),
      );
      const userIds = Array.from(new Set(rows.map((r) => r.moved_by).filter(Boolean))) as string[];

      const [keepRes, dupRes, profRes] = await Promise.all([
        keepIds.length
          ? supabase.from('crm_leads').select('id, name, email, phone').in('id', keepIds)
          : Promise.resolve({ data: [] as never[] }),
        dupIds.length
          ? supabase.from('crm_leads').select('id, archived_at').in('id', dupIds)
          : Promise.resolve({ data: [] as never[] }),
        userIds.length
          ? supabase.from('profiles').select('id, full_name').in('id', userIds)
          : Promise.resolve({ data: [] as never[] }),
      ]);

      const keepMap = new Map(
        ((keepRes.data ?? []) as { id: string; name: string; email: string; phone: string | null }[])
          .map((l) => [l.id, l]),
      );
      const dupMap = new Map(
        ((dupRes.data ?? []) as { id: string; archived_at: string | null }[]).map((l) => [
          l.id,
          !!l.archived_at,
        ]),
      );
      const profMap = new Map(
        ((profRes.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]),
      );

      return rows.map<LeadMergeEvent>((r) => {
        const mergedId = typeof r.metadata?.['merged_lead_id'] === 'string'
          ? (r.metadata['merged_lead_id'] as string)
          : null;
        return {
          id: r.id,
          created_at: r.created_at,
          reason: r.reason,
          moved_by: r.moved_by,
          moved_by_name: r.moved_by ? profMap.get(r.moved_by) ?? null : null,
          keep: keepMap.get(r.lead_id) ?? null,
          merged_lead_id: mergedId,
          merged_email: (r.metadata?.['merged_email'] as string) ?? null,
          merged_phone: (r.metadata?.['merged_phone'] as string) ?? null,
          merged_archived: mergedId ? dupMap.get(mergedId) ?? false : false,
        };
      });
    },
  });
}

export interface IdentityMetrics {
  blocked7: number;
  blocked30: number;
  blockedTotal: number;
  merged7: number;
  merged30: number;
  mergedTotal: number;
  blockedBySource: { key: string; count: number }[];
}

/** Contadores de bloqueios e fusões (7/30 dias e total). */
export function useCrmIdentityMetrics(): { data: IdentityMetrics | undefined; isLoading: boolean } {
  const blocks = useIdentityBlocks(1000);
  const merges = useLeadMerges(1000);

  const isLoading = blocks.isLoading || merges.isLoading;
  if (isLoading || !blocks.data || !merges.data) return { data: undefined, isLoading };

  const now = Date.now();
  const within = (iso: string, days: number) =>
    now - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;

  const bySource = new Map<string, number>();
  blocks.data.forEach((b) => {
    const key = b.page_key || b.source || 'desconhecida';
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  });

  return {
    isLoading: false,
    data: {
      blocked7: blocks.data.filter((b) => within(b.created_at, 7)).length,
      blocked30: blocks.data.filter((b) => within(b.created_at, 30)).length,
      blockedTotal: blocks.data.length,
      merged7: merges.data.filter((m) => within(m.created_at, 7)).length,
      merged30: merges.data.filter((m) => within(m.created_at, 30)).length,
      mergedTotal: merges.data.length,
      blockedBySource: Array.from(bySource.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    },
  };
}
