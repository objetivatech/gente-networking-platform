import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface GenteEmAcao {
  id: string;
  user_id: string;
  partner_id: string | null;
  meeting_type: 'membro' | 'convidado';
  guest_name: string | null;
  guest_company: string | null;
  notes: string | null;
  meeting_date: string;
  created_at: string;
  image_url: string | null;
  partner?: { full_name: string; company: string | null; avatar_url: string | null } | null;
}

export interface CreateGenteEmAcaoInput {
  meeting_type: 'membro' | 'convidado';
  partner_id?: string;
  guest_name?: string;
  guest_company?: string;
  notes?: string;
  meeting_date: string;
  image_url?: string;
}

export function useGenteEmAcao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings, isLoading } = useQuery({
    queryKey: ['gente-em-acao', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gente_em_acao')
        .select('*')
        .eq('user_id', user?.id)
        .order('meeting_date', { ascending: false });

      if (error) throw error;

      // Fetch partner profiles separately
      const partnerIds = data.filter(m => m.partner_id).map(m => m.partner_id);
      let partners: Record<string, any> = {};
      
      if (partnerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, company, avatar_url')
          .in('id', partnerIds);
        
        profilesData?.forEach(p => { partners[p.id] = p; });
      }

      return data.map(m => ({
        ...m,
        partner: m.partner_id ? partners[m.partner_id] : null
      })) as GenteEmAcao[];
    },
    enabled: !!user?.id,
  });

  const createMeeting = useMutation({
    mutationFn: async (input: CreateGenteEmAcaoInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase.from('gente_em_acao').insert({
        user_id: user.id,
        meeting_type: input.meeting_type,
        partner_id: input.meeting_type === 'membro' ? input.partner_id : null,
        guest_name: input.meeting_type === 'convidado' ? input.guest_name : null,
        guest_company: input.meeting_type === 'convidado' ? input.guest_company : null,
        notes: input.notes,
        meeting_date: input.meeting_date,
        image_url: input.image_url || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gente-em-acao'] }); toast({ title: 'Sucesso!', description: 'Reunião registrada' }); },
    onError: () => { toast({ title: 'Erro', description: 'Erro ao registrar reunião', variant: 'destructive' }); },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('gente_em_acao').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gente-em-acao'] }); toast({ title: 'Sucesso!', description: 'Reunião removida' }); },
  });

  return { meetings, isLoading, createMeeting, deleteMeeting };
}
