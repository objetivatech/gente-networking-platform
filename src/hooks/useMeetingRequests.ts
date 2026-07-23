/**
 * useMeetingRequests - v3.31.0
 *
 * Gerencia solicitações de "Agendar Gente em Ação" com fluxo de confirmação:
 * solicitante cria → destinatário confirma/recusa → solicitante pode cancelar.
 *
 * @author Diogo Devitte / Ranktop
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type MeetingRequestStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';

export interface MeetingRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  proposed_start: string;
  duration_minutes: number;
  location: string | null;
  message: string | null;
  status: MeetingRequestStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  requester?: { id: string; full_name: string; email: string | null; avatar_url: string | null } | null;
  recipient?: { id: string; full_name: string; email: string | null; avatar_url: string | null } | null;
}

interface CreateMeetingRequestInput {
  recipient_id: string;
  proposed_start: string; // ISO local (será convertido para timestamptz)
  duration_minutes: number;
  location?: string;
  message?: string;
}

export function useMeetingRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['meeting-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('meeting_requests')
        .select('*')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('proposed_start', { ascending: false });
      if (error) throw error;

      const rows = (data || []) as MeetingRequest[];
      const ids = Array.from(new Set(rows.flatMap((r) => [r.requester_id, r.recipient_id])));
      if (ids.length === 0) return rows;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', ids);
      const map: Record<string, any> = {};
      profiles?.forEach((p: any) => (map[p.id] = p));
      return rows.map((r) => ({
        ...r,
        requester: map[r.requester_id] || null,
        recipient: map[r.recipient_id] || null,
      }));
    },
    enabled: !!user?.id,
  });

  const createRequest = useMutation({
    mutationFn: async (input: CreateMeetingRequestInput) => {
      if (!user?.id) throw new Error('Não autenticado');
      const payload = {
        requester_id: user.id,
        recipient_id: input.recipient_id,
        proposed_start: new Date(input.proposed_start).toISOString(),
        duration_minutes: input.duration_minutes,
        location: input.location || null,
        message: input.message || null,
      };
      const { data, error } = await (supabase as any)
        .from('meeting_requests')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // Notifica destinatário via activity_feed + email (best effort)
      try {
        const { data: requester } = await supabase
          .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        const { data: recipient } = await supabase
          .from('profiles').select('full_name, email').eq('id', input.recipient_id).maybeSingle();

        await (supabase as any).rpc('add_activity_feed', {
          _user_id: input.recipient_id,
          _type: 'meeting_request',
          _title: 'Nova solicitação de Gente em Ação',
          _description: `${requester?.full_name || 'Um membro'} quer agendar um 1x1 com você.`,
          _reference_id: data.id,
          _metadata: { meeting_request_id: data.id },
          _team_id: null,
        });

        if (recipient?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: recipient.email,
              subject: 'Nova solicitação de Gente em Ação',
              template: 'meeting_request',
              template_data: {
                recipient_name: recipient.full_name || '',
                requester_name: requester?.full_name || 'Um membro',
                proposed_start: payload.proposed_start,
                duration_minutes: payload.duration_minutes,
                location: payload.location || '',
                message: payload.message || '',
                link: `${window.location.origin}/perfil?tab=agendamentos`,
              },
            },
          });
        }
      } catch (e) {
        console.warn('Notificação de solicitação falhou (não crítico):', e);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting-requests'] });
      toast({ title: 'Solicitação enviada!', description: 'O membro receberá um aviso para confirmar.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e?.message || 'Erro ao enviar solicitação', variant: 'destructive' }),
  });

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'confirmed' | 'declined' }) => {
      const { data, error } = await (supabase as any)
        .from('meeting_requests')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      // Notifica o solicitante
      try {
        const req = data as MeetingRequest;
        const { data: requester } = await supabase
          .from('profiles').select('full_name, email').eq('id', req.requester_id).maybeSingle();
        const { data: me } = await supabase
          .from('profiles').select('full_name').eq('id', req.recipient_id).maybeSingle();

        await (supabase as any).rpc('add_activity_feed', {
          _user_id: req.requester_id,
          _type: 'meeting_request',
          _title: status === 'confirmed' ? 'Gente em Ação confirmado' : 'Solicitação de Gente em Ação recusada',
          _description: `${me?.full_name || 'O membro'} ${status === 'confirmed' ? 'confirmou' : 'recusou'} a solicitação.`,
          _reference_id: req.id,
          _metadata: { meeting_request_id: req.id, status },
          _team_id: null,
        });

        if (requester?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: requester.email,
              subject: status === 'confirmed' ? 'Gente em Ação confirmado ✅' : 'Solicitação de Gente em Ação recusada',
              template: 'meeting_response',
              template_data: {
                requester_name: requester.full_name || '',
                recipient_name: me?.full_name || 'O membro',
                status,
                proposed_start: req.proposed_start,
                duration_minutes: req.duration_minutes,
                location: req.location || '',
                link: `${window.location.origin}/perfil?tab=agendamentos`,
              },
            },
          });
        }
      } catch (e) {
        console.warn('Notificação de resposta falhou (não crítico):', e);
      }

      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['meeting-requests'] });
      toast({ title: vars.status === 'confirmed' ? 'Confirmado!' : 'Recusado', description: vars.status === 'confirmed' ? 'O solicitante foi avisado.' : 'A solicitação foi recusada.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e?.message || 'Erro ao responder', variant: 'destructive' }),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('meeting_requests')
        .update({ status: 'cancelled', responded_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting-requests'] });
      toast({ title: 'Cancelado', description: 'Solicitação cancelada.' });
    },
  });

  const sent = (requests || []).filter((r) => r.requester_id === user?.id);
  const received = (requests || []).filter((r) => r.recipient_id === user?.id);
  const pendingReceivedCount = received.filter((r) => r.status === 'pending').length;

  return { requests: requests || [], sent, received, pendingReceivedCount, isLoading, createRequest, respond, cancel };
}
