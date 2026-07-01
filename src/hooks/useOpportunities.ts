/**
 * useOpportunities - Mural de Oportunidades (Item 7, Fase 3).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Hook que gerencia o mural de oportunidades entre membros (publicar, listar,
 * atualizar situação e remover). Restrito a membros/facilitadores/admins via RLS.
 * NÃO pontua na gamificação (decisão de escopo da Fase 3).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type OpportunityType = 'servico' | 'parceria' | 'demanda' | 'outro';
export type OpportunityStatus = 'aberta' | 'fechada';

export interface Opportunity {
  id: string;
  user_id: string;
  type: OpportunityType;
  title: string;
  description: string | null;
  status: OpportunityStatus;
  created_at: string;
  updated_at: string;
  author?: { full_name: string; company: string | null; avatar_url: string | null } | null;
}

export interface CreateOpportunityInput {
  type: OpportunityType;
  title: string;
  description?: string;
}

export function useOpportunities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async (): Promise<Opportunity[]> => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = [...new Set((data || []).map((o) => o.user_id))];
      let map: Record<string, { full_name: string; company: string | null; avatar_url: string | null }> = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, company, avatar_url')
          .in('id', ids);
        map = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, company: p.company, avatar_url: p.avatar_url };
          return acc;
        }, {} as typeof map);
      }
      return (data || []).map((o) => ({ ...o, author: map[o.user_id] || null })) as Opportunity[];
    },
  });

  const createOpportunity = useMutation({
    mutationFn: async (input: CreateOpportunityInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('opportunities').insert({
        user_id: user.id,
        type: input.type,
        title: input.title,
        description: input.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({ title: 'Publicado!', description: 'Sua oportunidade está no mural.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e?.message || 'Falha ao publicar', variant: 'destructive' }),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OpportunityStatus }) => {
      const { error } = await supabase.from('opportunities').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({ title: 'Situação atualizada' });
    },
  });

  const deleteOpportunity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('opportunities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({ title: 'Removida' });
    },
  });

  return { opportunities, isLoading, createOpportunity, toggleStatus, deleteOpportunity };
}
