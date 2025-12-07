import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Testimonial {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
  from_user?: { full_name: string; company: string | null; avatar_url: string | null };
  to_user?: { full_name: string; company: string | null; avatar_url: string | null };
}

export function useTestimonials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchWithProfiles = async (data: any[], field: 'from_user_id' | 'to_user_id') => {
    const ids = data.map(t => t[field]);
    if (ids.length === 0) return data;
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, company, avatar_url').in('id', ids);
    const map: Record<string, any> = {};
    profiles?.forEach(p => { map[p.id] = p; });
    return data.map(t => ({ ...t, [field === 'from_user_id' ? 'from_user' : 'to_user']: map[t[field]] }));
  };

  const { data: sentTestimonials, isLoading: loadingSent } = useQuery({
    queryKey: ['testimonials', 'sent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('testimonials').select('*').eq('from_user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      return await fetchWithProfiles(data, 'to_user_id') as Testimonial[];
    },
    enabled: !!user?.id,
  });

  const { data: receivedTestimonials, isLoading: loadingReceived } = useQuery({
    queryKey: ['testimonials', 'received', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('testimonials').select('*').eq('to_user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      return await fetchWithProfiles(data, 'from_user_id') as Testimonial[];
    },
    enabled: !!user?.id,
  });

  const createTestimonial = useMutation({
    mutationFn: async (input: { to_user_id: string; content: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase.from('testimonials').insert({ from_user_id: user.id, to_user_id: input.to_user_id, content: input.content }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['testimonials'] }); toast({ title: 'Sucesso!', description: 'Depoimento enviado' }); },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao enviar depoimento', variant: 'destructive' }); },
  });

  const deleteTestimonial = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('testimonials').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['testimonials'] }); toast({ title: 'Sucesso!', description: 'Depoimento removido' }); },
  });

  return { sentTestimonials, receivedTestimonials, isLoading: loadingSent || loadingReceived, createTestimonial, deleteTestimonial };
}
