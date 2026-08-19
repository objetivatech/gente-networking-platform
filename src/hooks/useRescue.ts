/**
 * useRescue - Central de Resgate e Reativação (v3.43.0).
 *
 * Consulta e gerencia campanhas (`rescue_campaigns`) e disparos (`rescue_dispatches`)
 * da régua automática para ex-membros e convidados.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type RescueAudience = 'ex_membro' | 'convidado' | 'interno';
export type RescueDispatchStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled' | 'skipped';

export interface RescueCampaign {
  id: string;
  audience: RescueAudience;
  step: number;
  name: string;
  delay_days: number;
  subject: string;
  intro: string | null;
  body_html: string;
  offer_html: string | null;
  cta_label: string;
  whatsapp_message: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RescueDispatch {
  id: string;
  audience: RescueAudience;
  campaign_id: string | null;
  step: number;
  profile_id: string | null;
  lead_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  status: RescueDispatchStatus;
  scheduled_for: string;
  sent_at: string | null;
  cancel_reason: string | null;
  error: string | null;
  created_at: string;
}

export const RESCUE_AUDIENCE_LABEL: Record<RescueAudience, string> = {
  ex_membro: 'Ex-membros',
  convidado: 'Convidados',
  interno: 'Alerta interno',
};

export const RESCUE_STATUS_LABEL: Record<RescueDispatchStatus, string> = {
  scheduled: 'Agendado',
  sent: 'Enviado',
  failed: 'Falhou',
  cancelled: 'Cancelado',
  skipped: 'Ignorado',
};

export function useRescueCampaigns() {
  return useQuery({
    queryKey: ['rescue-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rescue_campaigns' as never)
        .select('*')
        .order('audience', { ascending: true })
        .order('step', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RescueCampaign[];
    },
  });
}

export function useUpdateRescueCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RescueCampaign> }) => {
      const { error } = await supabase
        .from('rescue_campaigns' as never)
        .update(patch as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rescue-campaigns'] });
      toast({ title: 'Campanha atualizada' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao atualizar campanha',
        variant: 'destructive',
      });
    },
  });
}

export function useRescueDispatches(limit = 300) {
  return useQuery({
    queryKey: ['rescue-dispatches', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rescue_dispatches' as never)
        .select('*')
        .order('scheduled_for', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as RescueDispatch[];
    },
  });
}

export function useCancelRescueDispatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rescue_dispatches' as never)
        .update({ status: 'cancelled', cancel_reason: 'cancelado pelo admin' } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rescue-dispatches'] });
      toast({ title: 'Disparo cancelado' });
    },
  });
}

/** Executa o motor da régua imediatamente (mesma rotina do cron diário). */
export function useRunRescueNow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (dryRun?: boolean) => {
      const { data, error } = await supabase.functions.invoke('rescue-runner', {
        body: { dry_run: !!dryRun },
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rescue-dispatches'] });
      toast({
        title: 'Régua executada',
        description: `Agendados: ${data?.scheduled ?? 0} | Enviados: ${data?.sent ?? 0}`,
      });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao executar régua',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
