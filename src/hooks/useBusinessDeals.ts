import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface BusinessDeal {
  id: string;
  closed_by_user_id: string;
  referred_by_user_id: string | null;
  client_name: string | null;
  description: string | null;
  value: number;
  deal_date: string;
  created_at: string;
  closed_by?: { full_name: string; company: string | null; avatar_url: string | null };
  referred_by?: { full_name: string; company: string | null; avatar_url: string | null } | null;
}

export interface CreateBusinessDealInput {
  referred_by_user_id?: string;
  client_name?: string;
  description?: string;
  value: number;
  deal_date: string;
}

export function useBusinessDeals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchProfiles = async (ids: string[]) => {
    if (ids.length === 0) return {};
    const { data } = await supabase.from('profiles').select('id, full_name, company, avatar_url').in('id', ids.filter(Boolean));
    const map: Record<string, any> = {};
    data?.forEach(p => { map[p.id] = p; });
    return map;
  };

  const { data: myDeals, isLoading: loadingMy } = useQuery({
    queryKey: ['business-deals', 'my', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_deals').select('*').eq('closed_by_user_id', user?.id).order('deal_date', { ascending: false });
      if (error) throw error;
      const profiles = await fetchProfiles(data.map(d => d.referred_by_user_id).filter(Boolean) as string[]);
      return data.map(d => ({ ...d, referred_by: d.referred_by_user_id ? profiles[d.referred_by_user_id] : null })) as BusinessDeal[];
    },
    enabled: !!user?.id,
  });

  const { data: referredDeals, isLoading: loadingReferred } = useQuery({
    queryKey: ['business-deals', 'referred', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_deals').select('*').eq('referred_by_user_id', user?.id).order('deal_date', { ascending: false });
      if (error) throw error;
      const profiles = await fetchProfiles(data.map(d => d.closed_by_user_id));
      return data.map(d => ({ ...d, closed_by: profiles[d.closed_by_user_id] })) as BusinessDeal[];
    },
    enabled: !!user?.id,
  });

  const createDeal = useMutation({
    mutationFn: async (input: CreateBusinessDealInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase.from('business_deals').insert({ closed_by_user_id: user.id, referred_by_user_id: input.referred_by_user_id || null, client_name: input.client_name, description: input.description, value: input.value, deal_date: input.deal_date }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['business-deals'] }); toast({ title: 'Sucesso!', description: 'Negócio registrado' }); },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao registrar negócio', variant: 'destructive' }); },
  });

  const deleteDeal = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('business_deals').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['business-deals'] }); toast({ title: 'Sucesso!', description: 'Negócio removido' }); },
  });

  return { myDeals, referredDeals, isLoading: loadingMy || loadingReferred, createDeal, deleteDeal };
}
