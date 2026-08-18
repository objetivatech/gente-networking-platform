/**
 * @file PublicProfileCases.tsx
 * @description Carrossel de cases na página pública do membro: dois por vez (um no celular),
 * ordem aleatória, troca automática a cada 5s com pausa no hover/toque.
 * Consome a função pública segura get_public_profile_cases.
 * @copyright Ranktop / Gente Networking
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RichText from '@/components/RichText';
import { ChevronLeft, ChevronRight, User, HelpCircle, Lightbulb, Trophy } from 'lucide-react';

interface PublicCase {
  id: string;
  title: string;
  client_name: string | null;
  client_context: string | null;
  problem: string | null;
  solution: string | null;
  success_result: string | null;
  case_type: string | null;
}

const ROTATE_MS = 5000;

/** Embaralhamento simples (Fisher-Yates). */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const STEPS = [
  { key: 'client_context', label: 'Cliente', icon: User },
  { key: 'problem', label: 'Problema', icon: HelpCircle },
  { key: 'solution', label: 'Solução', icon: Lightbulb },
  { key: 'success_result', label: 'Sucesso', icon: Trophy },
] as const;

export default function PublicProfileCases({ slug }: { slug: string }) {
  const [cases, setCases] = useState<PublicCase[]>([]);
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(2);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_public_profile_cases', { _slug: slug });
      if (!active) return;
      if (error) { console.error('[PublicProfileCases]', error); return; }
      setCases(shuffle((data || []) as PublicCase[]));
    })();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    const apply = () => setPerView(1);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  useEffect(() => {
    if (paused || cases.length <= perView) return;
    timer.current = window.setInterval(() => {
      setStart((s) => (s + perView) % cases.length);
    }, ROTATE_MS);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [paused, cases.length, perView]);

  const visible = useMemo(() => {
    if (!cases.length) return [];
    return Array.from({ length: Math.min(perView, cases.length) }, (_, i) => cases[(start + i) % cases.length]);
  }, [cases, start, perView]);

  if (!cases.length) return null;

  const move = (dir: number) => {
    setStart((s) => (s + dir * perView + cases.length) % cases.length);
  };

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-lg font-bold text-[#1E3A5F]">Cases de sucesso</h2>
        {cases.length > perView && (
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Anterior" onClick={() => move(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Próximo" onClick={() => move(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((c) => (
          <Card key={c.id} className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#1E3A5F] text-wrap-anywhere">{c.title}</CardTitle>
              {c.client_name && <p className="text-sm text-muted-foreground">{c.client_name}</p>}
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {STEPS.map(({ key, label, icon: Icon }) => {
                const value = c[key];
                if (!value) return null;
                return (
                  <div key={key} className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </p>
                    <RichText value={value} className="text-sm text-muted-foreground" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
