/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect, useRef, useState } from 'react';
import { useConnectionOnboarding } from '@/hooks/useConnectionOnboarding';
import { watchedDelta } from '@/lib/connection-onboarding';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, RotateCcw } from 'lucide-react';
export function ConnectionVideoGate() {
  const { config, progress, record } = useConnectionOnboarding('assinante');
  const video = useRef<HTMLVideoElement>(null);
  const lastPosition = useRef(0);
  const [mediaError, setMediaError] = useState(false);
  const [ready, setReady] = useState(false);
  const recordRef = useRef(record);
  const savedSeconds = useRef(progress.data?.watched_seconds ?? 0);
  savedSeconds.current = progress.data?.watched_seconds ?? 0;
  recordRef.current = record;
  useEffect(() => {
    let active = true;
    recordRef.current.mutateAsync(0).then(() => { if (active) setReady(true); }).catch(() => {});
    return () => { active = false; };
  }, [config.data?.version]);
  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      const player = video.current;
      if (!player || recordRef.current.isPending) return;
      const delta = player.ended && document.visibilityState === 'visible'
        ? Math.min(5, Math.max(0, (config.data?.duration_seconds ?? 0) - savedSeconds.current))
        : watchedDelta(player.currentTime - lastPosition.current, !player.paused, document.visibilityState === 'visible');
      lastPosition.current = player.currentTime;
      if (delta) recordRef.current.mutate(delta);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [ready, config.data?.duration_seconds]);
  const duration = config.data?.duration_seconds ?? 1;
  const seconds = progress.data?.watched_seconds ?? 0;
  return <section className="mx-auto max-w-3xl space-y-5 py-8">
    <p className="text-sm font-semibold text-primary">Gente Conexões</p>
    <h1 className="text-2xl sm:text-3xl font-bold text-wrap-anywhere">{config.data?.title}</h1>
    <video key={config.data?.version} ref={video} src={config.data?.video_url ?? undefined} controls playsInline preload="metadata" className="aspect-video w-full rounded-lg bg-muted" onError={() => setMediaError(true)} onLoadedMetadata={() => { if (video.current) { video.current.currentTime = Math.min(seconds, Math.max(0, video.current.duration - 1)); lastPosition.current = video.current.currentTime; } }} onSeeking={() => {
      const player = video.current;
      if (player && player.currentTime > seconds + 5) player.currentTime = seconds;
      if (player) lastPosition.current = player.currentTime;
    }} onPlay={() => { lastPosition.current = video.current?.currentTime ?? 0; }} />
    <Progress value={Math.min(100, seconds / duration * 100)} aria-label="Progresso do vídeo" />
    <p className="text-sm text-muted-foreground">{Math.min(100, Math.floor(seconds / duration * 100))}% concluído</p>
    {record.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Salvando progresso" />}
    {(record.isError || mediaError) && <div className="space-y-3"><p className="text-destructive">{mediaError ? 'O vídeo não está disponível. Fale com a organização ou tente novamente.' : 'Não foi possível salvar o progresso. Tente novamente.'}</p><Button variant="outline" onClick={() => { setMediaError(false); video.current?.load(); record.mutateAsync(0).then(() => setReady(true)).catch(() => {}); }}><RotateCcw className="mr-2 h-4 w-4" />Tentar novamente</Button></div>}
  </section>;
}