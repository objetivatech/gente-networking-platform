/**
 * useCrmLeadPages - Páginas de captação (LPs) descobertas automaticamente (v3.34.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Cada LP/página que envia leads via `submit-lead` é registrada automaticamente
 * em `crm_lead_pages`. Não há cadastro manual: novas páginas aparecem sozinhas.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

/** Normaliza uma URL informada manualmente para virar `page_key`. */
export function normalizePageKey(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  return value.split('?')[0].replace(/\/$/, '');
}

/**
 * v3.47.0 — Cadastro antecipado de páginas conhecidas (LPs já publicadas que
 * ainda não converteram). Não incrementa contador: apenas garante o filtro.
 */
export function useSyncKnownPages() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (urls: string[]) => {
      const keys = Array.from(
        new Set(urls.map(normalizePageKey).filter((k): k is string => !!k)),
      );
      let created = 0;
      for (const key of keys) {
        const isUrl = /^https?:\/\//i.test(key);
        const { error } = await supabase.rpc('crm_register_known_page', {
          _page_key: key,
          ...(isUrl ? { _page_url: key } : {}),
        });
        if (error) throw error;
        created += 1;
      }
      return created;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['crm-lead-pages'] });
      toast({
        title: 'Páginas sincronizadas',
        description: `${count} página(s) disponíveis nos filtros de origem.`,
      });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao sincronizar páginas',
        description: err instanceof Error ? err.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    },
  });
}
