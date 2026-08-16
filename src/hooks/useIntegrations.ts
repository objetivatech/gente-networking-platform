/**
 * useIntegrations - Configurações de integrações da plataforma (v3.35.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Guarda apenas provedor ativo, ambiente, remetente e limites de disparo.
 * Nenhuma chave de API é gravada no banco — elas vivem no cofre de secrets.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type IntegrationCategory = 'payments' | 'signature' | 'email';

export interface IntegrationSetting {
  id: string;
  category: IntegrationCategory;
  provider: string | null;
  environment: string;
  config: Record<string, unknown>;
  rate_limit_count: number | null;
  rate_limit_window_hours: number | null;
  last_checked_at: string | null;
  last_check_ok: boolean | null;
}

export interface ProviderOption {
  value: string;
  label: string;
  secret: string;
  /** Campos extras de credencial exigidos pelo provedor. */
  extraSecrets?: { name: string; label: string }[];
}

export const INTEGRATION_PROVIDERS: Record<IntegrationCategory, ProviderOption[]> = {
  payments: [
    {
      value: 'efi',
      label: 'EFI (Gerencianet)',
      secret: 'EFI_API_KEY',
      extraSecrets: [
        { name: 'EFI_CLIENT_ID', label: 'Client ID' },
        { name: 'EFI_CLIENT_SECRET', label: 'Client Secret' },
      ],
    },
    { value: 'mercadopago', label: 'Mercado Pago', secret: 'MERCADOPAGO_API_KEY' },
    { value: 'asaas', label: 'Asaas', secret: 'ASAAS_API_KEY' },
    { value: 'infinitypay', label: 'Infinity Pay', secret: 'INFINITYPAY_API_KEY' },
  ],
  signature: [
    { value: 'autentique', label: 'Autentique', secret: 'AUTENTIQUE_API_KEY' },
    { value: 'docusign', label: 'DocuSign', secret: 'DOCUSIGN_API_KEY' },
    { value: 'clicksign', label: 'Clicksign', secret: 'CLICKSIGN_API_KEY' },
  ],
  email: [
    { value: 'resend', label: 'Resend', secret: 'RESEND_API_KEY' },
    { value: 'brevo', label: 'Brevo', secret: 'BREVO_API_KEY' },
    { value: 'sender', label: 'Sender', secret: 'SENDER_API_KEY' },
    {
      value: 'smtp',
      label: 'SMTP genérico',
      secret: 'SMTP_API_KEY',
      extraSecrets: [
        { name: 'SMTP_HOST', label: 'Servidor SMTP' },
        { name: 'SMTP_USER', label: 'Usuário SMTP' },
      ],
    },
  ],
};

export function useIntegrationSettings() {
  return useQuery({
    queryKey: ['integration-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('integration_settings').select('*');
      if (error) throw error;
      return (data ?? []) as unknown as IntegrationSetting[];
    },
  });
}

export function useSaveIntegration() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (patch: Partial<IntegrationSetting> & { category: IntegrationCategory }) => {
      const { error } = await supabase
        .from('integration_settings')
        .update({
          provider: patch.provider ?? null,
          environment: patch.environment ?? 'production',
          config: (patch.config ?? {}) as never,
          rate_limit_count: patch.rate_limit_count ?? null,
          rate_limit_window_hours: patch.rate_limit_window_hours ?? null,
        })
        .eq('category', patch.category);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration-settings'] });
      toast({ title: 'Integração salva' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

/** Diz quais chaves já estão disponíveis (Vault ou ambiente) — nunca expõe o valor. */
export function useIntegrationSecrets() {
  return useQuery({
    queryKey: ['integration-secrets'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('integration-status', { body: {} });
      if (error) throw error;
      return ((data as { secrets?: Record<string, boolean> })?.secrets ?? {}) as Record<
        string,
        boolean
      >;
    },
    retry: false,
    staleTime: 60_000,
  });
}

/** Grava a chave cifrada no cofre do banco (Vault). O valor nunca volta ao navegador. */
export function useSaveSecret() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ name, value }: { name: string; value: string }) => {
      const { data, error } = await supabase.rpc('set_integration_secret' as never, {
        _name: name,
        _value: value,
      } as never);
      if (error) throw error;
      const res = data as unknown as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || 'Não foi possível salvar a chave.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration-secrets'] });
      toast({ title: 'Chave salva com segurança' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao salvar a chave',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

/** Remove a chave do cofre. */
export function useDeleteSecret() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.rpc('delete_integration_secret' as never, {
        _name: name,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration-secrets'] });
      toast({ title: 'Chave removida' });
    },
  });
}

/** Testa a credencial do provedor ativo sem expor o valor. */
export function useTestIntegration() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      category: IntegrationCategory;
      provider: string;
      secret: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('integration-status', {
        body: { action: 'test', ...input },
      });
      if (error) throw error;
      return data as { ok: boolean; details: string };
    },
    onSuccess: (res) => {
      toast({
        title: res.ok ? 'Conexão validada' : 'Falha na conexão',
        description: res.details,
        variant: res.ok ? undefined : 'destructive',
      });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Não foi possível testar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

