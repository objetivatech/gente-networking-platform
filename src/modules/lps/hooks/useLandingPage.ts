/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/modules/lps/lib/supabaseQuery';
import { validateSlug } from '../lib/rules';

export interface LandingPage {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  template: string;
  capture_source: 'lp_gentehub' | 'lp_participe' | 'lp_networking' | 'site_elementor' | 'api' | 'convite_manual' | 'convite_membro';
  meta_title: string | null;
  meta_description: string | null;
  whatsapp_group_link: string | null;
  event_date: string | null;
  redirect_when_expired: boolean;
  redirect_to_slug: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  logo_size: string | null;
  thank_you_title: string | null;
  thank_you_message: string | null;
  thank_you_redirect_delay: number | null;
  og_image_url: string | null;
  canonical_url: string | null;
  /** @deprecated não usado — mantido apenas por compatibilidade com registros antigos. */
  crm_team_id: string | null;
  /** @deprecated não usado — mantido apenas por compatibilidade com registros antigos. */
  crm_group_team_map: Record<string, string> | null;

  created_at: string;
  updated_at: string;
}

export function useLandingPage(slug: string) {
  return useQuery({
    queryKey: ['lps', 'landing-page', slug],
    queryFn: async () => {
      const result = await withTimeout(
        supabase
          .from('landing_pages')
          .select('*')
          .eq('slug', slug)
          .single(),
        10000
      );

      if (result.error) throw result.error;
      return result.data as LandingPage;
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
    enabled: !!slug,
  });
}

export function useLandingPages() {
  return useQuery({
    queryKey: ['lps', 'landing-pages'],
    queryFn: async () => {
      const result = await withTimeout(
        supabase
          .from('landing_pages')
          .select('*')
          .order('created_at', { ascending: true }),
        10000
      );

      if (result.error) throw result.error;
      return result.data as LandingPage[];
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
  });
}

export function useUpdateLandingPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LandingPage> & { id: string }) => {
      const { error } = await supabase
        .from('landing_pages')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      const { data: refetchedData, error: refetchError } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (refetchError) throw refetchError;
      return refetchedData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'landing-pages'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['lps', 'landing-page', data.slug] });
      }
    },
  });
}

export function useCreateLandingPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (page: {
      name: string;
      slug: string;
      is_active?: boolean;
      meta_title?: string;
      meta_description?: string;
      primary_color?: string;
      secondary_color?: string;
    }) => {
      if (!validateSlug(page.slug)) throw new Error('Endereço reservado ou inválido.');
      const { data: insertData, error: insertError } = await supabase
        .from('landing_pages')
        .insert(page)
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', insertData.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'landing-pages'] });
    },
  });
}

export function useDuplicateLandingPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceId, newSlug, newName }: { sourceId: string; newSlug: string; newName: string }) => {
      if (!validateSlug(newSlug)) throw new Error('Endereço reservado ou inválido.');
      const { data, error } = await supabase.rpc('lp_duplicate_page', { _source_id: sourceId, _slug: newSlug, _name: newName });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'landing-pages'] });
    },
  });
}

export function useDeleteLandingPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      // Database cascade removes blocks/content atomically and preserves audit history.
      const { error } = await supabase
        .from('landing_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'landing-pages'] });
    },
  });
}
