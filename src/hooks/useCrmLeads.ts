/**
 * useCrmLeads - Query e mutations para o CRM de leads unificado (v3.24.0 + v3.25.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CrmLeadStatus = 'novo' | 'em_qualificacao' | 'qualificado' | 'hub_ativo' | 'fechado' | 'perdido';
export type CrmLeadSource =
  | 'lp_gentehub'
  | 'lp_participe'
  | 'lp_networking'
  | 'site_elementor'
  | 'convite_manual'
  | 'api';

export type CrmContractStatus = 'not_sent' | 'sent' | 'signed' | 'rejected' | 'expired' | null;
export type CrmPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | null;

export interface CrmLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  business_segment: string | null;
  source: CrmLeadSource;
  source_detail: string | null;
  target_team_id: string | null;
  status: CrmLeadStatus;
  notes: string | null;
  invited_by: string | null;
  invitation_id: string | null;
  profile_id: string | null;
  meeting_attendance_count: number;
  first_attendance_at: string | null;
  is_hub: boolean;
  contract_status: CrmContractStatus;
  contract_signed_pdf_path: string | null;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  autentique_document_id: string | null;
  contract_signing_url: string | null;
  contract_template_id: string | null;
  contract_template_version: number | null;
  contract_variables: Record<string, string> | null;
  payment_status: CrmPaymentStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CrmLeadHistoryEntry {
  id: string;
  lead_id: string;
  from_status: CrmLeadStatus | null;
  to_status: CrmLeadStatus | null;
  moved_by: string | null;
  reason: string | null;
  source_snapshot: CrmLeadSource | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  moved_by_name?: string | null;
}

export const CRM_STATUS_LABEL: Record<CrmLeadStatus, string> = {
  novo: 'Novo',
  em_qualificacao: 'Em Qualificação',
  qualificado: 'Qualificado',
  hub_ativo: 'HUB Ativo',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export const CRM_SOURCE_LABEL: Record<CrmLeadSource, string> = {
  lp_gentehub: 'LP Gente HUB',
  lp_participe: 'LP Participe',
  lp_networking: 'LP Networking',
  site_elementor: 'Site',
  convite_manual: 'Convite Manual',
  api: 'API',
};

export const CRM_EVENT_LABEL: Record<string, string> = {
  status_change: 'Mudança de status',
  contract_sent: 'Contrato enviado',
  contract_signed: 'Contrato assinado',
  contract_rejected: 'Contrato rejeitado',
  contract_expired: 'Contrato expirado',
  contract_event: 'Evento de contrato',
  hub_billing_triggered: 'Cobrança HUB disparada',
  hub_billing_failed: 'Falha na cobrança HUB',
  payment_paid_manual: 'Pagamento marcado manualmente',
  promoted: 'Promovido a membro',
  note_added: 'Nota adicionada',
  manual_edit: 'Edição manual',
};

export const CRM_STATUS_ORDER: CrmLeadStatus[] = [
  'novo',
  'em_qualificacao',
  'qualificado',
  'hub_ativo',
  'fechado',
  'perdido',
];

export function useCrmLeads() {
  return useQuery({
    queryKey: ['crm-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CrmLead[];
    },
  });
}

export function useUpdateCrmLeadStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: CrmLeadStatus; notes?: string }) => {
      const patch: Record<string, unknown> = { status };
      if (notes !== undefined) patch.notes = notes;
      const { error } = await supabase.from('crm_leads').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-history'] });
      toast({ title: 'Lead atualizado', description: 'Status alterado com sucesso.' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Não foi possível atualizar o lead.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });
}

export function useMigrateExistingGuests() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('migrate-existing-guests', {
        body: {},
      });
      if (error) throw error;
      return data as { success: boolean; stats: Record<string, number> };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      const s = data?.stats;
      toast({
        title: 'Backfill concluído',
        description: s
          ? `Criados: ${s.leads_created} | Atualizados: ${s.leads_updated} | Ignorados: ${s.skipped}`
          : 'Sincronização executada.',
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Falha no backfill.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });
}

// ---- v3.25.0 ----

export function useLeadHistory(leadId: string | null) {
  return useQuery({
    queryKey: ['crm-lead-history', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_history')
        .select('*')
        .eq('lead_id', leadId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as unknown as CrmLeadHistoryEntry[];
      const userIds = Array.from(new Set(rows.map((r) => r.moved_by).filter(Boolean))) as string[];
      if (userIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
        rows.forEach((r) => {
          r.moved_by_name = r.moved_by ? map.get(r.moved_by) ?? null : null;
        });
      }
      return rows;
    },
  });
}

export function useCrmAuditFeed(limit = 200) {
  return useQuery({
    queryKey: ['crm-audit-feed', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as unknown as CrmLeadHistoryEntry[];
      const userIds = Array.from(new Set(rows.map((r) => r.moved_by).filter(Boolean))) as string[];
      const leadIds = Array.from(new Set(rows.map((r) => r.lead_id)));
      const [profs, leads] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id, full_name').in('id', userIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
        leadIds.length
          ? supabase.from('crm_leads').select('id, name, email').in('id', leadIds)
          : Promise.resolve({ data: [] as { id: string; name: string; email: string }[] }),
      ]);
      const uMap = new Map((profs.data ?? []).map((p) => [p.id, p.full_name]));
      const lMap = new Map((leads.data ?? []).map((l) => [l.id, l]));
      return rows.map((r) => ({
        ...r,
        moved_by_name: r.moved_by ? uMap.get(r.moved_by) ?? null : null,
        lead: lMap.get(r.lead_id) ?? null,
      }));
    },
  });
}

export function usePromoteCrmLead() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (args: {
      leadId: string;
      teamId: string;
      skipContract?: boolean;
      skipPayment?: boolean;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('promote_crm_lead_to_member', {
        _lead_id: args.leadId,
        _team_id: args.teamId,
        _skip_contract: !!args.skipContract,
        _skip_payment: !!args.skipPayment,
        _reason: args.reason ?? null,
      });
      if (error) throw error;
      const res = data as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || 'Falha ao promover lead');
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-history'] });
      qc.invalidateQueries({ queryKey: ['admin-members'] });
      qc.invalidateQueries({ queryKey: ['members-directory'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Lead promovido', description: 'Convertido em membro com sucesso.' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro na promoção',
        description: err instanceof Error ? err.message : 'Falha ao promover lead',
        variant: 'destructive',
      });
    },
  });
}

export function useSendContract() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.functions.invoke('send-contract', {
        body: { lead_id: leadId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-history'] });
      toast({ title: 'Contrato enviado', description: 'Documento criado no Autentique.' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Falha ao enviar contrato',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useAddLeadNote() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, note }: { leadId: string; note: string }) => {
      const { data, error } = await supabase.rpc('add_crm_lead_note', {
        _lead_id: leadId,
        _note: note,
      });
      if (error) throw error;
      const res = data as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || 'Falha ao adicionar nota');
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-lead-history'] });
      toast({ title: 'Nota adicionada' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao adicionar nota',
        variant: 'destructive',
      });
    },
  });
}

export function useGetContractUrl() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.functions.invoke('get-contract-url', {
        body: { lead_id: leadId },
      });
      if (error) throw error;
      return data as { url: string };
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível gerar o link',
        variant: 'destructive',
      });
    },
  });
}
