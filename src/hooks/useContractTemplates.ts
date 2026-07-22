/**
 * useContractTemplates - CRUD para modelos de contrato editáveis (v3.26.0).
 * Admin-only. Placeholders {{chave}} + schema de variáveis dinâmicas.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContractVariableField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  required?: boolean;
  placeholder?: string;
  default?: string;
}

export interface ContractTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  body_html: string;
  variables_schema: ContractVariableField[];
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplateVersion {
  id: string;
  template_id: string;
  version: number;
  name: string;
  body_html: string;
  variables_schema: ContractVariableField[];
  changed_by: string | null;
  created_at: string;
}

export const CONTRACT_BUILTIN_PLACEHOLDERS = [
  { key: 'nome', label: 'Nome do lead' },
  { key: 'email', label: 'Email do lead' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'segmento', label: 'Segmento de negócio' },
  { key: 'grupo', label: 'Grupo destino' },
  { key: 'data_hoje', label: 'Data de hoje' },
];

export function useContractTemplates() {
  return useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_templates' as never)
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ContractTemplate[];
    },
  });
}

export function useDefaultContractTemplate() {
  return useQuery({
    queryKey: ['contract-template-default'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_templates' as never)
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ContractTemplate | null;
    },
  });
}

export function useContractTemplate(id: string | null) {
  return useQuery({
    queryKey: ['contract-template', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_templates' as never)
        .select('*')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data as unknown as ContractTemplate;
    },
  });
}

export function useContractTemplateVersions(templateId: string | null) {
  return useQuery({
    queryKey: ['contract-template-versions', templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_template_versions' as never)
        .select('*')
        .eq('template_id', templateId as string)
        .order('version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContractTemplateVersion[];
    },
  });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function useSaveContractTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      input: Partial<ContractTemplate> & { id?: string; name: string; body_html: string },
    ) => {
      const patch = {
        name: input.name,
        description: input.description ?? null,
        body_html: input.body_html,
        variables_schema: input.variables_schema ?? [],
        is_active: input.is_active ?? true,
        is_default: input.is_default ?? false,
      };

      if (input.id) {
        const { data, error } = await supabase
          .from('contract_templates' as never)
          .update(patch)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as unknown as ContractTemplate;
      }

      const slug = input.slug || slugify(input.name) || `modelo-${Date.now()}`;
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('contract_templates' as never)
        .insert({
          ...patch,
          slug,
          created_by: userData?.user?.id ?? null,
        } as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as ContractTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-templates'] });
      qc.invalidateQueries({ queryKey: ['contract-template-default'] });
      toast({ title: 'Modelo salvo', description: 'Alteração registrada e versionada.' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao salvar modelo',
        description: err instanceof Error ? err.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteContractTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contract_templates' as never).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-templates'] });
      toast({ title: 'Modelo removido' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    },
  });
}

/** Renderiza o preview substituindo placeholders no client. */
export function renderTemplatePreview(
  html: string,
  vars: Record<string, string | undefined | null>,
): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null || v === '') return `<em style="color:#a13">{{${key}}}</em>`;
    return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  });
}
