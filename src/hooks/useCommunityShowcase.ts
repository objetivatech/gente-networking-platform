/**
 * useCommunityShowcase - Vitrine interna de Assinantes e Convidados ativos.
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

export interface CommunityShowcaseProfile {
  id: string;
  full_name: string;
  company: string | null;
  position: string | null;
  avatar_url: string | null;
  business_segment: string | null;
  what_i_do: string | null;
  ideal_client: string | null;
  tags: string[];
  role: 'assinante' | 'convidado';
}

export function useCommunityShowcase(enabled = true) {
  return useQuery({
    queryKey: ['community-showcase'],
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<CommunityShowcaseProfile[]> => {
      const { data, error } = await supabase.rpc('get_community_showcase');
      if (error) {
        if (error.message?.includes('forbidden')) return [];
        throw error;
      }
      return (data || []) as CommunityShowcaseProfile[];
    },
  });
}
