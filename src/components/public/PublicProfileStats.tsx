/**
 * @file PublicProfileStats.tsx
 * @description Faixa de KPIs da página pública do membro (Presenças, Gente em Ação,
 * Depoimentos, Indicações e total em negócios). Consome a função pública segura
 * get_public_profile_stats, que devolve apenas totais agregados.
 * @copyright Ranktop / Gente Networking
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    { label: 'Presenças', value: String(stats.attendances_count) },
    { label: 'Gente em Ação', value: String(stats.gente_em_acao_count) },
    { label: 'Depoimentos', value: String(stats.testimonials_count) },
    { label: 'Indicações', value: String(stats.referrals_count) },
  ];

  const hasData =
    items.some((i) => i.value !== '0') || Number(stats.business_total) > 0;
  if (!hasData) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-wrap-anywhere">
            {label}
          </p>
          <p className="text-2xl font-bold text-[#1E3A5F]">{value}</p>
        </div>
      ))}
      <div className="col-span-2 min-w-0 rounded-xl bg-[#1E3A5F] p-4 text-center md:col-span-1">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">Em negócios</p>
        <p className="text-xl font-bold text-[#F7941D] text-wrap-anywhere">{currency(stats.business_total)}</p>
      </div>
    </div>
  );
}
