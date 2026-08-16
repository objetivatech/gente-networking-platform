/**
 * useHubMeetings - Fonte única dos encontros Gente HUB em aberto (v3.36.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Usada pelo CRM (vínculo do lead ao encontro) e pela página de Convites,
 * garantindo que os dois lugares enxerguem exatamente a mesma lista.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HubMeeting {
  id: string;
  title: string;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
}

export interface MeetingLeadAttendance {
  id: string;
  meeting_id: string;
  lead_id: string;
  created_at: string;
  lead?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    business_segment: string | null;
  } | null;
}

/** Encontros Gente HUB de hoje em diante, do mais próximo ao mais distante. */
export function useHubMeetings() {
  return useQuery({
    queryKey: ['hub-meetings-open'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, meeting_date, meeting_time, location')
        .eq('event_type', 'hub_event')
        .gte('meeting_date', today)
        .order('meeting_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as HubMeeting[];
    },
    staleTime: 60_000,
  });
}

/** Leads (sem conta na plataforma) vinculados a encontros. */
export function useMeetingLeadAttendances(meetingId?: string) {
  return useQuery({
    queryKey: ['meeting-lead-attendances', meetingId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('meeting_lead_attendances')
        .select(
          'id, meeting_id, lead_id, created_at, lead:crm_leads(id, name, email, phone, company, business_segment)',
        );
      if (meetingId) query = query.eq('meeting_id', meetingId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as MeetingLeadAttendance[];
    },
  });
}

export function useLinkLeadToMeeting() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['meeting-lead-attendances'] });
    qc.invalidateQueries({ queryKey: ['crm-leads'] });
    qc.invalidateQueries({ queryKey: ['crm-lead-history'] });
    qc.invalidateQueries({ queryKey: ['meetings'] });
  };

  const link = useMutation({
    mutationFn: async ({ leadId, meetingId }: { leadId: string; meetingId: string }) => {
      const { error } = await supabase
        .from('meeting_lead_attendances')
        .insert({ lead_id: leadId, meeting_id: meetingId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Lead vinculado ao encontro' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Não foi possível vincular',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const unlink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meeting_lead_attendances').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Vínculo removido' });
    },
  });

  return { link, unlink };
}
