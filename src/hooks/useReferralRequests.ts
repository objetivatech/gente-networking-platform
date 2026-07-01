/**
 * useReferralRequests - Pedidos de Indicação (broadcast) — Item 3, Fase 3.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Hook que gerencia pedidos de indicação em broadcast para a comunidade e suas
 * respostas. Restrito a membros/facilitadores/admins via RLS. NÃO pontua na
 * gamificação por si só (a indicação em si continua sendo registrada em /indicacoes).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ReferralRequestStatus = 'aberta' | 'atendida' | 'fechada';

export interface ReferralRequestResponse {
  id: string;
  request_id: string;
  user_id: string;
  message: string;
  referral_id: string | null;
  created_at: string;
  author?: { full_name: string; avatar_url: string | null } | null;
}

export interface ReferralRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_segment: string | null;
  status: ReferralRequestStatus;
  created_at: string;
  updated_at: string;
  author?: { full_name: string; company: string | null; avatar_url: string | null } | null;
  responses?: ReferralRequestResponse[];
}

export interface CreateReferralRequestInput {
  title: string;
  description?: string;
  target_segment?: string;
}

export function useReferralRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['referral-requests'],
    queryFn: async (): Promise<ReferralRequest[]> => {
      const { data, error } = await supabase
        .from('referral_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: responses } = await supabase
        .from('referral_request_responses')
        .select('*')
        .order('created_at', { ascending: true });

      const ids = [
        ...new Set([
          ...(data || []).map((r) => r.user_id),
          ...(responses || []).map((r) => r.user_id),
        ]),
      ];
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

      return (data || []).map((r) => ({
        ...r,
        author: map[r.user_id] || null,
        responses: (responses || [])
          .filter((resp) => resp.request_id === r.id)
          .map((resp) => ({ ...resp, author: map[resp.user_id] || null })),
      })) as ReferralRequest[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (input: CreateReferralRequestInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('referral_requests').insert({
        user_id: user.id,
        title: input.title,
        description: input.description || null,
        target_segment: input.target_segment || null,
      });
      if (error) throw error;

      // Notifica por email todos os membros do mesmo grupo (o Feed é alimentado por trigger no banco).
      try {
        const { data: recipients } = await supabase.rpc('get_group_members_for_notification', {
          _user_id: user.id,
        });
        const toUserIds = (recipients || []).map((r: { user_id: string }) => r.user_id);
        if (toUserIds.length > 0) {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'referral_request',
              from_user_id: user.id,
              to_user_ids: toUserIds,
              request_title: input.title,
              target_segment: input.target_segment || undefined,
            },
          });
        }
      } catch (e) {
        console.error('Falha ao notificar o grupo sobre o pedido de indicação:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-requests'] });
      toast({ title: 'Pedido publicado!', description: 'A comunidade poderá ajudar com indicações.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e?.message || 'Falha ao publicar', variant: 'destructive' }),
  });

  const respond = useMutation({
    mutationFn: async ({ requestId, message }: { requestId: string; message: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('referral_request_responses').insert({
        request_id: requestId,
        user_id: user.id,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-requests'] });
      toast({ title: 'Resposta enviada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e?.message || 'Falha ao responder', variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReferralRequestStatus }) => {
      const { error } = await supabase.from('referral_requests').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-requests'] });
      toast({ title: 'Situação atualizada' });
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('referral_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-requests'] });
      toast({ title: 'Pedido removido' });
    },
  });

  return { requests, isLoading, createRequest, respond, updateStatus, deleteRequest };
}
