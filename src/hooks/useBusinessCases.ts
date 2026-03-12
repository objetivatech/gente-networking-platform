import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface BusinessCase {
  id: string;
  user_id: string;
  business_deal_id: string | null;
  title: string;
  description: string | null;
  client_name: string | null;
  result: string | null;
  image_url: string | null;
  created_at: string;
}

export function useBusinessCases(userId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  const { data: cases, isLoading } = useQuery({
    queryKey: ['business-cases', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_cases')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BusinessCase[];
    },
    enabled: !!targetUserId,
  });

  const createCase = useMutation({
    mutationFn: async (newCase: { title: string; description?: string; client_name?: string; result?: string; business_deal_id?: string }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('business_cases')
        .insert({ ...newCase, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-cases'] });
      toast({ title: 'Case criado!', description: 'Seu case de negócio foi registrado.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível criar o case.', variant: 'destructive' });
    },
  });

  const deleteCase = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase.from('business_cases').delete().eq('id', caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-cases'] });
      toast({ title: 'Case removido' });
    },
  });

  return { cases, isLoading, createCase, deleteCase };
}
