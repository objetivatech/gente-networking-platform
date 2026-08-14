/**
 * useCrmPipelineStages - Colunas configuráveis do funil do CRM (v3.35.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * As 6 colunas originais são de sistema (podem ser renomeadas/reordenadas,
 * nunca excluídas, pois triggers e RPCs dependem delas). Colunas novas são
 * livres e já nascem integradas às notificações de troca de coluna.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CrmPipelineStage {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string;
  position: number;
  is_system: boolean;
  notify_on_enter: boolean;
  notify_emails: string[];
  active: boolean;
}

export function useCrmPipelineStages() {
  return useQuery({
    queryKey: ['crm-pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CrmPipelineStage[];
    },
    staleTime: 60_000,
  });
}

function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

export function useSaveStage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (stage: Partial<CrmPipelineStage> & { label: string }) => {
      const payload = {
        label: stage.label,
        description: stage.description ?? null,
        color: stage.color ?? '#1E3A5F',
        notify_on_enter: stage.notify_on_enter ?? false,
        notify_emails: stage.notify_emails ?? [],
        active: stage.active ?? true,
        position: stage.position ?? 99,
      };

      if (stage.id) {
        const { error } = await supabase
          .from('crm_pipeline_stages')
          .update(payload)
          .eq('id', stage.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from('crm_pipeline_stages')
        .insert({ ...payload, key: slugify(stage.label), is_system: false });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline-stages'] });
      toast({ title: 'Coluna salva' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao salvar coluna',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useReorderStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: { id: string; position: number }[]) => {
      for (const s of ordered) {
        const { error } = await supabase
          .from('crm_pipeline_stages')
          .update({ position: s.position })
          .eq('id', s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-pipeline-stages'] }),
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (stage: CrmPipelineStage) => {
      if (stage.is_system) throw new Error('Colunas de sistema não podem ser excluídas.');
      const { count } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact', head: true })
        .eq('stage_key', stage.key);
      if ((count ?? 0) > 0) {
        throw new Error(`Mova os ${count} lead(s) desta coluna antes de excluí-la.`);
      }
      const { error } = await supabase.from('crm_pipeline_stages').delete().eq('id', stage.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline-stages'] });
      toast({ title: 'Coluna removida' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Não foi possível remover',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}
