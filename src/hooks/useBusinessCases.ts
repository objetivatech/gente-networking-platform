/**
 * @file useBusinessCases.ts
 * @description Cases de negócio no formato de 4 passos (Cliente → Problema → Solução → Sucesso).
 * Campos de texto longo aceitam HTML sanitizado (editor rico). Cases antigos continuam
 * funcionando: description/result são usados como fallback de solution/success_result.
 * @copyright Ranktop / Gente Networking
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeRichText } from '@/lib/rich-text';

export type BusinessCaseType = 'plataforma' | 'externo';

export interface BusinessCase {
  id: string;
  user_id: string;
  business_deal_id: string | null;
  title: string;
  description: string | null;
  client_name: string | null;
  result: string | null;
  /** Passo 1 — contexto do cliente */
  client_context: string | null;
  /** Passo 2 — problema */
  problem: string | null;
  /** Passo 3 — solução */
  solution: string | null;
  /** Passo 4 — sucesso */
  success_result: string | null;
  needs_review: boolean;
  image_url: string | null;
  case_type: BusinessCaseType;
  created_at: string;
}

export interface NewBusinessCase {
  title: string;
  client_name?: string;
  client_context: string;
  problem: string;
  solution: string;
  success_result: string;
  business_deal_id?: string | null;
  image_url?: string | null;
  case_type?: BusinessCaseType;
}

export function useBusinessCases(userId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  const { data: cases, isLoading } = useQuery({
    queryKey: ['business-cases', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_cases')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        case_type: c.case_type || (c.business_deal_id ? 'plataforma' : 'externo'),
        client_context: c.client_context ?? c.client_name ?? null,
        problem: c.problem ?? null,
        solution: c.solution ?? c.description ?? null,
        success_result: c.success_result ?? c.result ?? null,
        needs_review: !!c.needs_review,
      })) as BusinessCase[];
    },
    enabled: !!targetUserId,
  });

  const createCase = useMutation({
    mutationFn: async (newCase: NewBusinessCase) => {
      if (!user?.id) throw new Error('Não autenticado');
      const case_type: BusinessCaseType = newCase.case_type || (newCase.business_deal_id ? 'plataforma' : 'externo');
      const client_context = sanitizeRichText(newCase.client_context);
      const problem = sanitizeRichText(newCase.problem);
      const solution = sanitizeRichText(newCase.solution);
      const success_result = sanitizeRichText(newCase.success_result);
      const payload: any = {
        user_id: user.id,
        title: newCase.title,
        client_name: newCase.client_name || null,
        client_context,
        problem,
        solution,
        success_result,
        // compatibilidade com telas legadas
        description: solution || null,
        result: success_result || null,
        needs_review: false,
        image_url: newCase.image_url || null,
        case_type,
        business_deal_id: case_type === 'plataforma' ? newCase.business_deal_id || null : null,
      };
      const { data, error } = await supabase.from('business_cases').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-cases'] });
      toast({ title: 'Case criado!', description: 'Seu case foi registrado.' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e?.message || 'Não foi possível criar o case.', variant: 'destructive' });
    },
  });

  const updateCase = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<NewBusinessCase> & { id: string }) => {
      const payload: any = {};
      if (fields.title !== undefined) payload.title = fields.title;
      if (fields.client_name !== undefined) payload.client_name = fields.client_name || null;
      if (fields.client_context !== undefined) payload.client_context = sanitizeRichText(fields.client_context);
      if (fields.problem !== undefined) payload.problem = sanitizeRichText(fields.problem);
      if (fields.solution !== undefined) {
        payload.solution = sanitizeRichText(fields.solution);
        payload.description = payload.solution || null;
      }
      if (fields.success_result !== undefined) {
        payload.success_result = sanitizeRichText(fields.success_result);
        payload.result = payload.success_result || null;
      }
      payload.needs_review = false;
      const { error } = await supabase.from('business_cases').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-cases'] });
      toast({ title: 'Case atualizado' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e?.message || 'Não foi possível atualizar o case.', variant: 'destructive' });
    },
  });

  const deleteCase = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase.from('business_cases').delete().eq('id', caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-cases'] });
      toast({ title: 'Case removido' });
    },
  });

  return { cases, isLoading, createCase, updateCase, deleteCase };
}
