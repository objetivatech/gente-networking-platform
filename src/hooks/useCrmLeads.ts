/**
 * useCrmLeads - Query e mutations para o CRM de leads unificado (v3.24.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CrmLeadStatus = 'novo' | 'em_qualificacao' | 'qualificado' | 'fechado' | 'perdido';
export type CrmLeadSource =
  | 'lp_gentehub'
  | 'lp_participe'
  | 'lp_networking'
  | 'site_elementor'
  | 'convite_manual'
  | 'api';

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
  contract_status: string | null;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
}

export const CRM_STATUS_LABEL: Record<CrmLeadStatus, string> = {
  novo: 'Novo',
  em_qualificacao: 'Em Qualificação',
  qualificado: 'Qualificado',
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

export const CRM_STATUS_ORDER: CrmLeadStatus[] = [
  'novo',
  'em_qualificacao',
  'qualificado',
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
