/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useConnectionOnboarding } from '@/hooks/useConnectionOnboarding';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
export default function AdminConnectionOnboarding() {
  const { role, isAdmin, isLoading } = useAdmin();
  const { config } = useConnectionOnboarding(role);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('Bem-vindo ao Gente Conexões');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState(60);
  const qc = useQueryClient();
  const { toast } = useToast();
  useEffect(() => { if (config.data) { setEnabled(config.data.enabled); setTitle(config.data.title); setUrl(config.data.video_url ?? ''); setDuration(config.data.duration_seconds); } }, [config.data]);
  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('connection-onboarding', { body: { action: 'configure', enabled, title, url, duration } });
      if (error || data?.error) throw new Error(data?.error ?? 'Não foi possível salvar');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['connection-onboarding-config'] }); toast({ title: 'Vídeo atualizado' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível salvar', description: error.message, variant: 'destructive' }),
  });
  if (isLoading || config.isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  if (!isAdmin) return <Navigate to="/" replace />;
  if (config.isError) return <Button variant="outline" onClick={() => config.refetch()}>Tentar novamente</Button>;
  return <div className="max-w-3xl space-y-6"><h1 className="text-2xl sm:text-3xl font-bold">Acolhimento · Gente Conexões</h1>
    <form data-rd-no-capture="true" className="space-y-5" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div className="flex items-center gap-3"><Switch id="onboarding-enabled" checked={enabled} onCheckedChange={setEnabled} /><Label htmlFor="onboarding-enabled">Vídeo obrigatório</Label></div>
      <div className="space-y-2"><Label htmlFor="onboarding-title">Título</Label><Input id="onboarding-title" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="onboarding-url">URL HTTPS do vídeo (arquivo MP4 ou WebM)</Label><Input id="onboarding-url" type="url" required={enabled} value={url} onChange={e => setUrl(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="onboarding-duration">Duração total em segundos</Label><Input id="onboarding-duration" type="number" required min={1} max={7200} value={duration} onChange={e => setDuration(Number(e.target.value))} /></div>
      {url && <video src={url} controls playsInline preload="metadata" className="aspect-video w-full rounded-lg bg-muted" onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration)) setDuration(Math.ceil(e.currentTarget.duration)); }} />}
      <Button type="submit" disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Salvar</Button>
    </form>
  </div>;
}