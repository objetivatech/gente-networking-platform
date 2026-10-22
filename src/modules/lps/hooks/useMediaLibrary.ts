/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/modules/lps/lib/supabaseQuery';

export interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useMediaLibrary() {
  return useQuery({
    queryKey: ['lps', 'media-library'],
    queryFn: async () => {
      const result = await withTimeout(
        supabase
          .from('media_library')
          .select('*')
          .order('created_at', { ascending: false }),
        10000
      );

      if (result.error) throw result.error;
      return result.data as MediaItem[];
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, altText }: { file: File; altText?: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to storage with timeout
      const uploadPromise = supabase.storage
        .from('lps-media')
        .upload(fileName, file);

      const uploadResult = await withTimeout(uploadPromise.then(r => r), 30000);

      if (uploadResult.error) {
        console.error('Upload error:', uploadResult.error);
        throw new Error(`Falha no upload: ${uploadResult.error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('lps-media')
        .getPublicUrl(fileName);

      const insertResult = await withTimeout(
        supabase
          .from('media_library')
          .insert({
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            alt_text: altText || file.name,
          })
          .select()
          .single(),
        10000
      );

      if (insertResult.error) {
        console.error('Insert error:', insertResult.error);
        throw new Error(`Falha ao salvar: ${insertResult.error.message}`);
      }
      
      return insertResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'media-library'] });
    },
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, alt_text }: { id: string; alt_text: string }) => {
      const { data, error } = await supabase
        .from('media_library')
        .update({ alt_text })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'media-library'] });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('media_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lps', 'media-library'] });
    },
  });
}
