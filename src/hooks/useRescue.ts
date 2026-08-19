/**
 * useRescue - Central de Resgate e Reativação (v3.43.0 / v3.44.0).
 *
 * Consulta e gerencia campanhas (`rescue_campaigns`), disparos (`rescue_dispatches`),
 * configurações da régua (`integration_settings.category = 'rescue'`) e o status do
 * orçamento diário de e-mails (via edge function `rescue-runner`).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type RescueAudience = 'ex_membro' | 'convidado' | 'risco';
export type RescueDispatchStatus = 'queued' | 'sent' | 'skipped' | 'cancelled' | 'error';

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
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface RescueSettings {
  daily_budget: number;
  transactional_reserve: number;
  send_days: number[];
  send_hour_start: number;
  send_hour_end: number;
  whatsapp_number: string;
  enabled: boolean;
}

export const RESCUE_SETTINGS_DEFAULTS: RescueSettings = {
  daily_budget: 300,
  transactional_reserve: 100,
  send_days: [2, 3, 4],
  send_hour_start: 9,
  send_hour_end: 11,
  whatsapp_number: '555121652325',
  enabled: true,
};

export interface RescueStatus {
  budget: { used: number; available: number; dailyBudget: number };
  queued: number;
  due: number;
  in_window: boolean;
  settings: RescueSettings;
}

export const RESCUE_AUDIENCE_LABEL: Record<RescueAudience, string> = {
  ex_membro: 'Ex-membros',
  convidado: 'Convidados',
  risco: 'Membro em risco',
};

export const RESCUE_STATUS_LABEL: Record<RescueDispatchStatus, string> = {
  queued: 'Agendado',
  sent: 'Enviado',
  skipped: 'Ignorado',
  cancelled: 'Cancelado',
  error: 'Falhou',
};

/** Variáveis suportadas nos textos das campanhas. */
export const RESCUE_VARIABLES = [
  { token: '{{nome}}', label: 'Primeiro nome do destinatário' },
  { token: '{{grupo}}', label: 'Grupo de origem' },
  { token: '{{dias_desde}}', label: 'Dias desde a saída/última presença' },
];

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

export function useRescueDispatches(limit = 500) {
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
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('rescue_dispatches' as never)
        .update({
          status: 'cancelled',
          cancel_reason: reason ?? 'cancelado pelo admin',
        } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rescue-dispatches'] });
      toast({ title: 'Disparo cancelado' });
    },
  });
}

/** Marca a etapa como ignorada — a régua segue para a próxima etapa. */
export function useSkipRescueDispatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rescue_dispatches' as never)
        .update({
          status: 'skipped',
          cancel_reason: 'etapa pulada pelo admin',
          sent_at: new Date().toISOString(),
        } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rescue-dispatches'] });
      toast({ title: 'Etapa pulada' });
    },
  });
}

/** Remove a pessoa da régua (opt-out permanente, respeitado por todas as campanhas). */
export function useRemoveFromRescue() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ profileId, leadId }: { profileId?: string | null; leadId?: string | null }) => {
      if (profileId) {
        const { error } = await supabase
          .from('profiles')
          .update({ rescue_opt_out: true } as never)
          .eq('id', profileId);
        if (error) throw error;
      }
      if (leadId) {
        const { error } = await supabase
          .from('crm_leads' as never)
          .update({ rescue_opt_out: true } as never)
          .eq('id', leadId);
        if (error) throw error;
      }
      const target = profileId ? { column: 'profile_id', value: profileId } : { column: 'lead_id', value: leadId };
      if (target.value) {
        await supabase
          .from('rescue_dispatches' as never)
          .update({ status: 'cancelled', cancel_reason: 'removido da régua' } as never)
          .eq(target.column, target.value)
          .eq('status', 'queued');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rescue-dispatches'] });
      toast({ title: 'Pessoa removida da régua' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao remover da régua',
        variant: 'destructive',
      });
    },
  });
}

/** Pausa temporária ("cool-off") — usada quando há conversa em andamento. */
export function usePauseRescue() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      profileId,
      leadId,
      days,
    }: {
      profileId?: string | null;
      leadId?: string | null;
      days: number;
    }) => {
      const until = new Date(Date.now() + days * 86_400_000).toISOString();
      if (profileId) {
        const { error } = await supabase
          .from('profiles')
          .update({ rescue_paused_until: until } as never)
          .eq('id', profileId);
        if (error) throw error;
      }
      if (leadId) {
        const { error } = await supabase
          .from('crm_leads' as never)
          .update({ rescue_paused_until: until } as never)
          .eq('id', leadId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rescue-dispatches'] });
      toast({ title: 'Régua pausada para esta pessoa' });
    },
  });
}

/** Orçamento diário de e-mails, fila e janela de envio (via rescue-runner). */
export function useRescueStatus() {
  return useQuery({
    queryKey: ['rescue-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('rescue-runner', {
        body: { action: 'status' },
      });
      if (error) throw error;
      return data as RescueStatus;
    },
    refetchInterval: 60_000,
  });
}

/** Configurações da régua guardadas em `integration_settings` (categoria `rescue`). */
export function useRescueSettings() {
  return useQuery({
    queryKey: ['rescue-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings' as never)
        .select('id, config')
        .eq('category', 'rescue')
        .maybeSingle();
      if (error) throw error;
      const row = data as unknown as { id: string; config: Partial<RescueSettings> } | null;
      return {
        id: row?.id ?? null,
        settings: { ...RESCUE_SETTINGS_DEFAULTS, ...(row?.config ?? {}) } as RescueSettings,
      };
    },
  });
}

export function useUpdateRescueSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (settings: RescueSettings) => {
      const { error } = await supabase
        .from('integration_settings' as never)
        .upsert(
          { category: 'rescue', config: settings as unknown as Record<string, unknown> } as never,
          { onConflict: 'category' } as never,
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rescue-settings'] });
      qc.invalidateQueries({ queryKey: ['rescue-status'] });
      toast({ title: 'Configurações salvas' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao salvar configurações',
        variant: 'destructive',
      });
    },
  });
}

/** Envia um e-mail de teste de uma campanha para o endereço informado. */
export function useSendRescueTest() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ campaignId, email }: { campaignId: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke('rescue-runner', {
        body: { action: 'test', campaign_id: campaignId, email },
      });
      if (error) throw error;
      return data as { success: boolean; error?: string };
    },
    onSuccess: (data) => {
      if (data?.success) toast({ title: 'E-mail de teste enviado' });
      else
        toast({
          title: 'Falha no envio',
          description: data?.error ?? 'Erro desconhecido',
          variant: 'destructive',
        });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro no teste',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

/** Executa o motor da régua imediatamente (mesma rotina do cron diário). */
export function useRunRescueNow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (opts?: { dryRun?: boolean; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('rescue-runner', {
        body: { dry_run: !!opts?.dryRun, force: !!opts?.force },
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rescue-dispatches'] });
      qc.invalidateQueries({ queryKey: ['rescue-status'] });
      const reason = data?.reason as string | undefined;
      toast({
        title: reason === 'fora_da_janela' ? 'Fora da janela de envio' : 'Régua executada',
        description: `Enfileirados: ${data?.queued ?? 0} | Enviados: ${data?.sent ?? 0} | Alertas: ${data?.risk_alerts ?? 0}`,
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

/** Envia agora um disparo específico da fila. */
export function useSendRescueDispatchNow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (dispatchId: string) => {
      const { data, error } = await supabase.functions.invoke('rescue-runner', {
        body: { dispatch_id: dispatchId },
      });
      if (error) throw error;
      return data as { success: boolean; outcome: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rescue-dispatches'] });
      qc.invalidateQueries({ queryKey: ['rescue-status'] });
      toast({
        title: data?.success ? 'E-mail enviado' : 'Envio não realizado',
        description: data?.success ? undefined : `Resultado: ${data?.outcome ?? 'desconhecido'}`,
        variant: data?.success ? undefined : 'destructive',
      });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro no envio',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
