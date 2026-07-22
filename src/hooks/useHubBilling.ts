/**
 * useHubBilling - Trilha de eventos de cobrança HUB (v3.26.0).
 * Admin-only. Idempotência + retry manual + marcar pago manualmente.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HubBillingEvent {
  id: string;
  lead_id: string;
  event_type: string;
  status: string;
  attempt: number;
  payload: Record<string, unknown>;
  triggered_by: string | null;
  created_at: string;
}

export const HUB_BILLING_LABEL: Record<string, string> = {
  triggered: 'Cobrança disparada',
  email_sent: 'Email enviado',
  payment_link_sent: 'Link de pagamento enviado',
  paid: 'Pagamento confirmado',
  manual_paid: 'Marcado como pago manualmente',
  failed: 'Falha no envio',
  retry: 'Reenvio manual',
};

export function useHubBillingEvents(leadId: string | null) {
  return useQuery({
    queryKey: ['hub-billing-events', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_billing_events' as never)
        .select('*')
        .eq('lead_id', leadId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HubBillingEvent[];
    },
  });
}

export function useDispatchHubBilling() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, force }: { leadId: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('dispatch-hub-billing', {
        body: { lead_id: leadId, force_retry: !!force },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['hub-billing-events', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-history'] });
      toast({ title: 'Cobrança disparada', description: 'Evento registrado no histórico.' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro na cobrança',
        description: err instanceof Error ? err.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkLeadPaid() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;

      const { error: upErr } = await supabase
        .from('crm_leads')
        .update({ payment_status: 'paid' })
        .eq('id', leadId);
      if (upErr) throw upErr;

      const { error: evErr } = await supabase.from('hub_billing_events' as never).insert({
        lead_id: leadId,
        event_type: 'manual_paid',
        status: 'paid',
        payload: { reason },
        triggered_by: uid,
      } as never);
      if (evErr) throw evErr;

      const { data: lead } = await supabase
        .from('crm_leads')
        .select('status, source')
        .eq('id', leadId)
        .single();

      await supabase.from('crm_lead_history').insert({
        lead_id: leadId,
        from_status: lead?.status ?? null,
        to_status: lead?.status ?? null,
        moved_by: uid,
        reason,
        source_snapshot: lead?.source ?? null,
        event_type: 'payment_paid_manual',
        metadata: { reason },
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['hub-billing-events', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-history'] });
      toast({ title: 'Pagamento registrado' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao registrar pagamento',
        variant: 'destructive',
      });
    },
  });
}
