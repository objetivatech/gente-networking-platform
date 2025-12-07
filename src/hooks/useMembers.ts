import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Member {
  id: string;
  full_name: string;
  email: string | null;
  company: string | null;
  avatar_url: string | null;
  rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante';
}

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, company, avatar_url, rank')
        .order('full_name');

      if (error) throw error;
      return data as Member[];
    },
  });
}
