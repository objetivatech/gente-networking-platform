/**
 * @file PublicProfileActivity.tsx
 * @description Linha do tempo somente leitura com as atividades recentes do membro na
 * página pública (/m/:slug). Consome a função pública segura get_public_profile_activity,
 * que devolve apenas tipos de atividade seguros para exibição externa. Nenhum item é
 * clicável — o feed completo continua sendo interno da plataforma.
 * @copyright Ranktop / Gente Networking
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PublicActivity {
  id: string;
  activity_type: string;
  title: string;
  created_at: string;
}

const LABEL: Record<string, string> = {
  attendance: 'Presença confirmada em encontro',
  gente_em_acao: 'Realizou um Gente em Ação',
  referral: 'Gerou uma indicação',
  testimonial: 'Depoimento registrado',
  business_deal: 'Negócio fechado na rede',
  business_case: 'Publicou um case de sucesso',
  matchmaking: 'Nova conexão no MatchMaking',
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days <= 0) return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return 'Ontem';
  if (days < 30) return `Há ${days} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PublicProfileActivity({ slug }: { slug: string }) {
  const [items, setItems] = useState<PublicActivity[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_public_profile_activity', { _slug: slug });
      if (!active) return;
      if (error) {
        console.error('[PublicProfileActivity]', error);
        return;
      }
      setItems((data || []) as PublicActivity[]);
    })();
    return () => { active = false; };
  }, [slug]);

  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-6 text-sm font-bold uppercase tracking-wider text-[#1E3A5F]">
        Atividades recentes
      </h2>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`relative min-w-0 border-l pl-6 pb-6 ${
              index === items.length - 1 ? 'border-transparent pb-0' : 'border-slate-100'
            }`}
          >
            <span
              className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ${
                index === 0
                  ? 'bg-[#F7941D] shadow-[0_0_0_4px_rgba(247,148,29,0.15)]'
                  : 'bg-slate-300'
              }`}
            />
            <p className="mb-1 text-[11px] font-medium text-slate-400">{formatWhen(item.created_at)}</p>
            <p className="text-sm leading-snug text-slate-700 text-wrap-anywhere">
              {LABEL[item.activity_type] || item.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
