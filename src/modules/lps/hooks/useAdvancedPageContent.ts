/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/modules/lps/lib/supabaseQuery';
import type { Json } from '@/integrations/supabase/types';

export interface AdvancedPageContentRow {
  id: string;
  landing_page_id: string;
  content: Json;
  created_at: string;
  updated_at: string;
}

export function useAdvancedPageContent(landingPageId: string | undefined) {
  return useQuery({
    queryKey: ['lps', 'advanced-page-content', landingPageId],
    queryFn: async () => {
      const result = await withTimeout(
        supabase
          .from('advanced_page_content')
          .select('*')
          .eq('landing_page_id', landingPageId ?? '')
          .maybeSingle(),
        10000
      );
      if (result.error) throw result.error;
      return (result.data as AdvancedPageContentRow | null) ?? null;
    },
    enabled: !!landingPageId,
    retry: 2,
    staleTime: 30000,
  });
}

export function useUpsertAdvancedPageContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ landing_page_id, content }: { landing_page_id: string; content: Json }) => {
      const { error } = await supabase
        .from('advanced_page_content')
        .upsert({ landing_page_id, content }, { onConflict: 'landing_page_id' });
      if (error) throw error;
      return { landing_page_id };
    },
    onSuccess: ({ landing_page_id }) => {
      qc.invalidateQueries({ queryKey: ['lps', 'advanced-page-content', landing_page_id] });
    },
  });
}
