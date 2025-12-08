import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  business_segment: string | null;
  points: number | null;
  rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante' | null;
}

export function useMembers() {
  const query = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company, position, bio, avatar_url, linkedin_url, instagram_url, website_url, business_segment, points, rank')
        .order('full_name');

      if (error) throw error;
      return data as Member[];
    },
  });

  return {
    members: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
