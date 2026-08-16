/**
 * useBilling - Planos, descontos, assinaturas e cobranças (v3.37.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Admin-only no CRUD (RLS garante). Os valores são sempre trabalhados em
 * centavos no banco e formatados apenas na camada de apresentação.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PlanType = 'recorrente' | 'pontual';
export type BillingInterval = 'monthly' | 'quarterly' | 'semiannual' | 'yearly';

export interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: PlanType;
  audience: string;
  amount_cents: number;
  currency: string;
  billing_interval: BillingInterval | null;
  installments: number | null;
  contract_template_id: string | null;
  active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BillingDiscount {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  value: number;
  plan_id: string | null;
  max_uses: number | null;
  uses: number;
  valid_until: string | null;
  active: boolean;
  created_at: string;
}

export interface BillingSubscription {
  id: string;
  plan_id: string;
  lead_id: string | null;
  profile_id: string | null;
  discount_id: string | null;
  status: 'draft' | 'active' | 'past_due' | 'canceled' | 'completed';
  amount_cents: number;
  start_date: string;
  next_charge_date: string | null;
  provider: string | null;
  external_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface BillingCharge {
  id: string;
  subscription_id: string | null;
  plan_id: string | null;
  lead_id: string | null;
  profile_id: string | null;
  amount_cents: number;
  status: 'pending' | 'sent' | 'paid' | 'failed' | 'canceled';
  due_date: string;
  paid_at: string | null;
  provider: string | null;
  payment_url: string | null;
  created_at: string;
}

export const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  recorrente: 'Recorrente',
  pontual: 'Pontual',
};

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  yearly: 'Anual',
};

export const SUBSCRIPTION_STATUS_LABEL: Record<BillingSubscription['status'], string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  past_due: 'Em atraso',
  canceled: 'Cancelada',
  completed: 'Concluída',
};

export const CHARGE_STATUS_LABEL: Record<BillingCharge['status'], string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  paid: 'Paga',
  failed: 'Falhou',
  canceled: 'Cancelada',
};

/** Formata centavos em BRL. */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    (cents ?? 0) / 100,
  );
}

/** Converte "1.234,56" ou "1234.56" em centavos. */
export function parseCurrencyToCents(input: string): number {
  const clean = input.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const value = Number.parseFloat(clean);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

const from = (table: string) => supabase.from(table as never);

export function useBillingPlans() {
  return useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const { data, error } = await from('billing_plans')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BillingPlan[];
    },
  });
}

export function useSaveBillingPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (plan: Partial<BillingPlan> & { name: string }) => {
      if (plan.id) {
        const { id, ...rest } = plan;
        const { error } = await from('billing_plans').update(rest as never).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await from('billing_plans')
        .insert({ ...plan, created_by: userData?.user?.id ?? null } as never)
        .select('id')
        .single();
      if (error) throw error;
      return (data as unknown as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-plans'] });
      toast({ title: 'Plano salvo' });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao salvar plano',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      }),
  });
}

export function useTogglePlanActive() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await from('billing_plans').update({ active } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-plans'] });
      toast({ title: 'Plano atualizado' });
    },
  });
}

export function useBillingDiscounts() {
  return useQuery({
    queryKey: ['billing-discounts'],
    queryFn: async () => {
      const { data, error } = await from('billing_discounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BillingDiscount[];
    },
  });
}

export function useSaveBillingDiscount() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (discount: Partial<BillingDiscount> & { code: string }) => {
      if (discount.id) {
        const { id, ...rest } = discount;
        const { error } = await from('billing_discounts').update(rest as never).eq('id', id);
        if (error) throw error;
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await from('billing_discounts').insert({
        ...discount,
        created_by: userData?.user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-discounts'] });
      toast({ title: 'Desconto salvo' });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao salvar desconto',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      }),
  });
}

export function useDeleteBillingDiscount() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await from('billing_discounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-discounts'] });
      toast({ title: 'Desconto removido' });
    },
  });
}

export function useBillingSubscriptions() {
  return useQuery({
    queryKey: ['billing-subscriptions'],
    queryFn: async () => {
      const { data, error } = await from('billing_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BillingSubscription[];
    },
  });
}

/** Assinaturas de um lead específico (usado no CRM). */
export function useLeadSubscriptions(leadId: string | null) {
  return useQuery({
    queryKey: ['billing-subscriptions', 'lead', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await from('billing_subscriptions')
        .select('*')
        .eq('lead_id', leadId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BillingSubscription[];
    },
  });
}

export function useSaveSubscription() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sub: Partial<BillingSubscription> & { plan_id: string }) => {
      if (sub.id) {
        const { id, ...rest } = sub;
        const { error } = await from('billing_subscriptions').update(rest as never).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await from('billing_subscriptions')
        .insert({ ...sub, created_by: userData?.user?.id ?? null } as never)
        .select('id')
        .single();
      if (error) throw error;
      return (data as unknown as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['billing-charges'] });
      toast({ title: 'Assinatura salva' });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao salvar assinatura',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      }),
  });
}

export function useBillingCharges(leadId?: string | null) {
  return useQuery({
    queryKey: ['billing-charges', leadId ?? 'all'],
    queryFn: async () => {
      let query = from('billing_charges').select('*').order('due_date', { ascending: false });
      if (leadId) query = query.eq('lead_id', leadId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as BillingCharge[];
    },
  });
}

/** Dispara (ou reenvia) a cobrança de uma assinatura pela edge function. */
export function useSendCharge() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: { subscription_id: string; due_date?: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('dispatch-billing-charge', {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-charges'] });
      qc.invalidateQueries({ queryKey: ['billing-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      toast({ title: 'Cobrança enviada', description: 'E-mail disparado e registro criado.' });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao enviar cobrança',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      }),
  });
}

export function useMarkChargePaid() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await from('billing_charges')
        .update({ status: 'paid', paid_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-charges'] });
      toast({ title: 'Cobrança marcada como paga' });
    },
  });
}
