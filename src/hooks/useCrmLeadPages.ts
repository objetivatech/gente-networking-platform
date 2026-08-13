/**
 * useCrmLeadPages - Páginas de captação (LPs) descobertas automaticamente (v3.34.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Cada LP/página que envia leads via `submit-lead` é registrada automaticamente
 * em `crm_lead_pages`. Não há cadastro manual: novas páginas aparecem sozinhas.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CrmLeadPage {
  id: string;
  page_key: string;
  page_url: string | null;
  title: string | null;
  source: string | null;
  leads_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

export function useCrmLeadPages() {
  return useQuery({
    queryKey: ['crm-lead-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_pages')
        .select('*')
        .order('leads_count', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CrmLeadPage[];
    },
    staleTime: 60_000,
  });
}

/** Chave da página de um lead (usa metadata.page_url, senão source_detail). */
export function leadPageKey(lead: {
  source_detail: string | null;
  metadata: Record<string, unknown> | null;
}): string | null {
  const url = lead.metadata?.['page_url'];
  if (typeof url === 'string' && url.trim()) return url.split('?')[0].replace(/\/$/, '');
  return lead.source_detail?.trim() || null;
}
