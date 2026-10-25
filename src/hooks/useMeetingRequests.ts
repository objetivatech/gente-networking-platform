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
import { useEntitlements } from './useEntitlements';
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
  whatsapp_opened_at: string | null;
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
  const { can, role } = useEntitlements();
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
    enabled: !!user?.id && (role === 'convidado' || can('can_create_gente_em_acao')),
  });

  const createRequest = useMutation({
    mutationFn: async (input: CreateMeetingRequestInput) => {
      if (!user?.id) throw new Error('Não autenticado');
      if (!can('can_create_gente_em_acao')) throw new Error('Agendamento não incluído no plano');
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

      const [{ data: requester }, { data: recipient }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase.from('profiles').select('full_name, email, phone, phone_digits').eq('id', input.recipient_id).maybeSingle(),
      ]);

      try {
        const { error: notificationError } = await supabase.functions.invoke('community-notification', { body: { kind: 'request', reference_id: data.id } });
        if (notificationError) toast({ title: 'Agendamento salvo', description: 'O aviso por e-mail falhou; use WhatsApp para reforçar o convite.', variant: 'destructive' });
      } catch { toast({ title: 'Agendamento salvo', description: 'Não foi possível enviar o e-mail.', variant: 'destructive' }); }

      return {
        request: data as MeetingRequest,
        requesterName: requester?.full_name || 'Um membro',
        recipientName: recipient?.full_name || 'Membro',
        recipientPhone: recipient?.phone_digits || recipient?.phone || null,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting-requests'] });
      toast({ title: 'Solicitação enviada!', description: 'Solicitação registrada para a pessoa confirmar.' });
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

      const { error: notificationError } = await supabase.functions.invoke('community-notification', { body: { kind: 'response', reference_id: id } });
      if (notificationError) toast({ title: 'Resposta salva', description: 'Não foi possível enviar o aviso por e-mail.', variant: 'destructive' });

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

  const registerWhatsAppOpen = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('register_meeting_request_whatsapp_open', {
        _request_id: requestId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meeting-requests'] }),
    onError: (e: Error) => console.warn('Não foi possível registrar a abertura do WhatsApp:', e),
  });

  const sent = (requests || []).filter((r) => r.requester_id === user?.id);
  const received = (requests || []).filter((r) => r.recipient_id === user?.id);
  const pendingReceivedCount = received.filter((r) => r.status === 'pending').length;

  return { requests: requests || [], sent, received, pendingReceivedCount, isLoading, createRequest, respond, cancel, registerWhatsAppOpen };
}
