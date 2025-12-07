import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Referral {
  id: string;
  from_user_id: string;
  to_user_id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  from_user?: { full_name: string; company: string | null; avatar_url: string | null };
  to_user?: { full_name: string; company: string | null; avatar_url: string | null };
}

export interface CreateReferralInput {
  to_user_id: string;
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

export function useReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchProfiles = async (ids: string[]) => {
    if (ids.length === 0) return {};
    const { data } = await supabase.from('profiles').select('id, full_name, company, avatar_url').in('id', ids);
    const map: Record<string, any> = {};
    data?.forEach(p => { map[p.id] = p; });
    return map;
  };

  const { data: sentReferrals, isLoading: loadingSent } = useQuery({
    queryKey: ['referrals', 'sent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('referrals').select('*').eq('from_user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      const profiles = await fetchProfiles(data.map(r => r.to_user_id));
      return data.map(r => ({ ...r, to_user: profiles[r.to_user_id] })) as Referral[];
    },
    enabled: !!user?.id,
  });

  const { data: receivedReferrals, isLoading: loadingReceived } = useQuery({
    queryKey: ['referrals', 'received', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('referrals').select('*').eq('to_user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      const profiles = await fetchProfiles(data.map(r => r.from_user_id));
      return data.map(r => ({ ...r, from_user: profiles[r.from_user_id] })) as Referral[];
    },
    enabled: !!user?.id,
  });

  const createReferral = useMutation({
    mutationFn: async (input: CreateReferralInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase.from('referrals').insert({
        from_user_id: user.id,
        to_user_id: input.to_user_id,
        contact_name: input.contact_name,
        contact_phone: input.contact_phone,
        contact_email: input.contact_email,
        notes: input.notes,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['referrals'] }); toast({ title: 'Sucesso!', description: 'Indicação enviada' }); },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao enviar indicação', variant: 'destructive' }); },
  });

  const deleteReferral = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('referrals').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['referrals'] }); toast({ title: 'Sucesso!', description: 'Indicação removida' }); },
  });

  return { sentReferrals, receivedReferrals, isLoading: loadingSent || loadingReceived, createReferral, deleteReferral };
}
