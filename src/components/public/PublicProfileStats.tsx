/**
 * @file PublicProfileStats.tsx
 * @description Bloco "Meus Resultados no Gente Networking" da página pública do membro.
 * Consome a função pública segura get_public_profile_stats, que devolve apenas totais.
 * @copyright Ranktop / Gente Networking
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, Handshake, MessageSquareQuote, Share2, TrendingUp } from 'lucide-react';

interface Stats {
  attendances_count: number;
  gente_em_acao_count: number;
  testimonials_count: number;
  referrals_count: number;
  business_total: number;
}

const currency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

export default function PublicProfileStats({ slug }: { slug: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_public_profile_stats', { _slug: slug });
      if (!active) return;
      if (error) { console.error('[PublicProfileStats]', error); return; }
      const first = Array.isArray(data) && data.length ? data[0] : null;
      setStats(first ? { ...first, business_total: Number(first.business_total || 0) } : null);
    })();
    return () => { active = false; };
  }, [slug]);

  if (!stats) return null;

  const items = [
    { icon: CalendarCheck, label: 'Presenças', value: String(stats.attendances_count) },
    { icon: Handshake, label: 'Gente em Ação', value: String(stats.gente_em_acao_count) },
    { icon: MessageSquareQuote, label: 'Depoimentos', value: String(stats.testimonials_count) },
    { icon: Share2, label: 'Indicações', value: String(stats.referrals_count) },
    { icon: TrendingUp, label: 'Em negócios', value: currency(stats.business_total) },
  ];

  const hasData = items.some((i) => i.value !== '0' && i.value !== currency(0));
  if (!hasData) return null;

  return (
    <Card>
      <CardContent className="py-6">
        <h2 className="text-lg font-bold text-[#1E3A5F] mb-4 text-center">
          Meus Resultados no Gente Networking
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {items.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border bg-muted/30 p-3 text-center min-w-0">
              <Icon className="h-5 w-5 mx-auto mb-1 text-[#F7941D]" />
              <p className="text-lg font-bold text-[#1E3A5F] text-wrap-anywhere">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
