/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/modules/lps/lib/supabaseQuery';
import type { Json } from '@/integrations/supabase/types';

export interface PageBlock {
  id: string;
  landing_page_id: string;
  block_type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  background_color: string | null;
  text_color: string | null;
  font_size: string | null;
  title_color: string | null;
  title_font_size: string | null;
  subtitle_color: string | null;
  subtitle_font_size: string | null;
  content_color: string | null;
  content_font_size: string | null;
  order_index: number;
  is_visible: boolean;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export function useBlocks(landingPageId: string | undefined) {
  return useQuery({
    queryKey: ['lps', 'blocks', landingPageId],
    queryFn: async () => {
      const result = await withTimeout(
        supabase
          .from('page_blocks')
          .select('*')
          .eq('landing_page_id', landingPageId ?? '')
          .order('order_index', { ascending: true }),
        10000
      );

      if (result.error) throw result.error;
      return result.data as PageBlock[];
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
    enabled: !!landingPageId,
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (block: {
      landing_page_id: string;
      block_type: string;
      title?: string;
      subtitle?: string;
      content?: string;
      image_url?: string;
      button_text?: string;
      button_link?: string;
      background_color?: string;
      text_color?: string;
      font_size?: string;
      order_index: number;
      is_visible?: boolean;
      settings?: Json;
    }) => {
      const { data: insertData, error: insertError } = await supabase
        .from('page_blocks')
        .insert(block)
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { data, error } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('id', insertData.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['lps', 'blocks', data.landing_page_id] });
      }
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, landing_page_id, ...updates }: {
      id: string;
      landing_page_id: string;
      title?: string;
      subtitle?: string;
      content?: string;
      image_url?: string;
      button_text?: string;
      button_link?: string;
      background_color?: string;
      text_color?: string;
      font_size?: string;
      title_color?: string;
      title_font_size?: string;
      subtitle_color?: string;
      subtitle_font_size?: string;
      content_color?: string;
      content_font_size?: string;
      order_index?: number;
      is_visible?: boolean;
      settings?: Json;
    }) => {
      const { error } = await supabase
        .from('page_blocks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      const { data, error: refetchError } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (refetchError) throw refetchError;
      return { ...data, landing_page_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'blocks', data.landing_page_id] });
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, landingPageId }: { id: string; landingPageId: string }) => {
      const { error } = await supabase
        .from('page_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, landingPageId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'blocks', data.landingPageId] });
    },
  });
}

export function useReorderBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blocks, landingPageId }: { blocks: { id: string; order_index: number }[]; landingPageId: string }) => {
      const updates = blocks.map(block => 
        supabase
          .from('page_blocks')
          .update({ order_index: block.order_index })
          .eq('id', block.id)
      );

      const results = await Promise.all(updates);
      const failed = results.find(result => result.error);
      if (failed?.error) throw failed.error;
      return landingPageId;
    },
    onSuccess: (landingPageId) => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'blocks', landingPageId] });
    },
  });
}
