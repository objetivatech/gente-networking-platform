import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type BusinessCaseType = 'plataforma' | 'externo';

export interface BusinessCase {
  id: string;
  user_id: string;
  business_deal_id: string | null;
  title: string;
  description: string | null;
  client_name: string | null;
  result: string | null;
  image_url: string | null;
  case_type: BusinessCaseType;
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
      return (data || []).map((c: any) => ({ ...c, case_type: c.case_type || (c.business_deal_id ? 'plataforma' : 'externo') })) as BusinessCase[];
    },
    enabled: !!targetUserId,
  });

  const createCase = useMutation({
    mutationFn: async (newCase: {
      title: string;
      description?: string;
      client_name?: string;
      result?: string;
      business_deal_id?: string | null;
      image_url?: string | null;
      case_type?: BusinessCaseType;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const case_type: BusinessCaseType = newCase.case_type || (newCase.business_deal_id ? 'plataforma' : 'externo');
      const payload: any = {
        user_id: user.id,
        title: newCase.title,
        description: newCase.description || null,
        client_name: newCase.client_name || null,
        result: newCase.result || null,
        image_url: newCase.image_url || null,
        case_type,
        business_deal_id: case_type === 'plataforma' ? newCase.business_deal_id || null : null,
      };
      const { data, error } = await supabase.from('business_cases').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-cases'] });
      toast({ title: 'Case criado!', description: 'Seu case foi registrado.' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e?.message || 'Não foi possível criar o case.', variant: 'destructive' });
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
