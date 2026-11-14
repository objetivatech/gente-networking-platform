/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { requiresConnectionVideo } from '@/lib/connection-onboarding';
export function useConnectionOnboarding(role: string | null | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const config = useQuery({
    queryKey: ['connection-onboarding-config', user?.id], enabled: Boolean(user && (role === 'assinante' || role === 'admin')),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('connection_onboarding_config').select('*').eq('id', true).single();
      if (error) throw error;
      return data;
    },
  });
  const progress = useQuery({
    queryKey: ['connection-onboarding-progress', user?.id, config.data?.version],
    enabled: Boolean(user && role === 'assinante' && config.data?.enabled),
    queryFn: async () => {
      if (!user || !config.data) return null;
      const { data, error } = await supabase.from('connection_onboarding_progress').select('watched_seconds,completed_at').eq('profile_id', user.id).eq('version', config.data.version).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const record = useMutation({
    mutationFn: async (seconds: number) => {
      if (!config.data) throw new Error('Vídeo indisponível');
      const { data, error } = await supabase.functions.invoke('connection-onboarding', { body: { action: 'progress', version: config.data.version, seconds } });
      if (error || data?.error) throw new Error(data?.error ?? 'Não foi possível salvar o progresso');
      return data as { watched_seconds: number; completed_at: string | null };
    },
    onSuccess: data => qc.setQueryData(['connection-onboarding-progress', user?.id, config.data?.version], data),
  });
  return { config, progress, record, required: requiresConnectionVideo(role, config.data?.enabled ?? false, progress.data?.completed_at), loading: config.isLoading || progress.isLoading, error: config.isError || progress.isError };
}