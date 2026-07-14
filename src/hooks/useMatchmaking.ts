/**
 * useMatchmaking - Motor de sugestões de conexão entre perfis (MatchMaking).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Calcula score de afinidade entre o membro logado e os demais perfis ativos
 * (membros e convidados, exceto admins e o próprio usuário) com base nos campos
 * de perfil: cliente ideal, o que faço, segmento e tags. Cada "check" cria um
 * registro de Gente em Ação e soma +10 pts via RPC `create_matchmaking_check`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { analyzeMatchOpportunity, type MatchType } from '@/lib/matchmaking-rules';

export interface MatchSuggestion {
  id: string;
  full_name: string;
  company: string | null;
  position: string | null;
  avatar_url: string | null;
  business_segment: string | null;
  what_i_do: string | null;
  ideal_client: string | null;
  tags: string[];
  role: string | null;
  score: number;
  reasons: string[];
  sharedTags: string[];
  alreadyConnected: boolean;
  matchType: MatchType;
  partnershipScore: number;
  opportunityTitle: string;
  opportunityDescription: string;
  opportunityIdeas: string[];
  serviceCategories: string[];
  sharedAudiences: string[];
}

export interface MyProfileForMatch {
  id: string;
  what_i_do: string | null;
  ideal_client: string | null;
  business_segment: string | null;
  tags: string[];
  isComplete: boolean;
  missingFields: string[];
}

export interface MatchmakingConnection {
  id: string;
  target_id: string;
  description: string | null;
  created_at: string;
  target?: { full_name: string; company: string | null; avatar_url: string | null } | null;
}

// Normaliza texto: minúsculas, sem acento
const normalize = (s: string | null | undefined): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Extrai palavras-chave relevantes (>= 4 letras) de um texto
const keywords = (s: string | null | undefined): string[] => {
  const stop = new Set([
    'para', 'com', 'que', 'dos', 'das', 'uma', 'meu', 'minha', 'seu', 'sua',
    'por', 'mais', 'como', 'pelo', 'pela', 'este', 'essa', 'isso', 'sobre',
  ]);
  return Array.from(
    new Set(
      normalize(s)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !stop.has(w))
    )
  );
};

const overlapCount = (a: string[], b: string[]): number => {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x)).length;
};

// Retorna um seed determinístico baseado no ano + número da semana ISO atual.
// Garante que a "sugestão da semana" seja estável ao longo dos 7 dias e mude
// automaticamente a cada nova semana, sem depender de backend.
const getIsoWeekSeed = (d = new Date()): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return date.getUTCFullYear() * 100 + weekNo;
};

// Escolhe deterministicamente uma sugestão da semana entre as melhores opções
// ainda não conectadas, priorizando maior score e usando o seed semanal para
// rotacionar entre os candidatos de topo.
const pickWeeklySuggestion = (
  suggestions: MatchSuggestion[]
): MatchSuggestion | null => {
  const pool = suggestions.filter((s) => !s.alreadyConnected && s.score > 0);
  if (pool.length === 0) return null;
  const topPool = pool.slice(0, Math.min(5, pool.length));
  const idx = getIsoWeekSeed() % topPool.length;
  return topPool[idx];
};


const REQUIRED_FIELDS: { key: keyof MyProfileForMatch; label: string }[] = [
  { key: 'what_i_do', label: 'O que eu faço' },
  { key: 'ideal_client', label: 'Cliente ideal' },
  { key: 'business_segment', label: 'Segmento de negócio' },
  { key: 'tags', label: 'Tags / palavras-chave' },
];

export function useMatchmaking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['matchmaking', user?.id],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) {
        return { myProfile: null as MyProfileForMatch | null, suggestions: [] as MatchSuggestion[] };
      }

      // 1. Perfis ativos
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, company, position, avatar_url, business_segment, what_i_do, ideal_client, tags')
        .eq('is_active', true);
      if (pErr) throw pErr;

      // 2. Roles (para excluir admins e classificar)
      const { data: roles, error: rErr } = await supabase.from('user_roles').select('user_id, role');
      if (rErr) throw rErr;
      const roleMap: Record<string, string> = {};
      roles?.forEach((r) => { roleMap[r.user_id] = r.role; });

      // 3. Conexões já realizadas pelo usuário
      const { data: connections, error: cErr } = await supabase
        .from('matchmaking_connections')
        .select('target_id')
        .eq('member_id', user.id);
      if (cErr) throw cErr;
      const connectedSet = new Set((connections || []).map((c) => c.target_id));

      // Perfil do usuário logado
      const me = (profiles || []).find((p) => p.id === user.id);
      const myTags: string[] = (me?.tags as string[] | null) || [];
      const myProfile: MyProfileForMatch | null = me
        ? {
            id: me.id,
            what_i_do: me.what_i_do,
            ideal_client: me.ideal_client,
            business_segment: me.business_segment,
            tags: myTags,
            isComplete: false,
            missingFields: [],
          }
        : null;

      if (myProfile) {
        const missing = REQUIRED_FIELDS.filter((f) => {
          const v = (myProfile as any)[f.key];
          return Array.isArray(v) ? v.length === 0 : !v || String(v).trim() === '';
        }).map((f) => f.label);
        myProfile.missingFields = missing;
        myProfile.isComplete = missing.length === 0;
      }

      const myIdeal = keywords(me?.ideal_client);
      const myWhat = keywords(me?.what_i_do);
      const mySegment = normalize(me?.business_segment);
      const myTagsNorm = myTags.map((t) => normalize(t)).filter(Boolean);

      const suggestions: MatchSuggestion[] = [];

      for (const p of profiles || []) {
        if (p.id === user.id) continue;
        const role = roleMap[p.id];
        if (role === 'admin') continue; // admins não entram no matchmaking

        const otherTags: string[] = ((p.tags as string[] | null) || []);
        const otherTagsNorm = otherTags.map((t) => normalize(t)).filter(Boolean);
        const otherWhat = keywords(p.what_i_do);
        const otherSegmentText = keywords(p.business_segment);
        const otherProfileText = [...otherWhat, ...otherSegmentText, ...otherTagsNorm];

        let score = 0;
        const reasons: string[] = [];

        // +40: meu cliente ideal aparece no que o outro faz/segmento/tags (e vice-versa)
        const idealHit = overlapCount(myIdeal, otherProfileText);
        const reverseIdealHit = overlapCount(keywords(p.ideal_client), [...myWhat, ...myTagsNorm, mySegment].filter(Boolean));
        const hasIdealClientFit = idealHit > 0 || reverseIdealHit > 0;
        if (hasIdealClientFit) {
          score += 40;
          reasons.push('Compatível com seu cliente ideal');
        }

        // +25: tags em comum (peso por quantidade)
        const sharedTagsNorm = myTagsNorm.filter((t) => otherTagsNorm.includes(t));
        const hasSharedTags = sharedTagsNorm.length > 0;
        if (hasSharedTags) {
          score += Math.min(25, sharedTagsNorm.length * 12);
          reasons.push(`${sharedTagsNorm.length} tag(s) em comum`);
        }

        // +15: mesmo segmento de negócio
        const hasSameSegment = !!mySegment && normalize(p.business_segment) === mySegment;
        if (hasSameSegment) {
          score += 15;
          reasons.push('Mesmo segmento de negócio');
        }

        // +10: perfil do outro bem preenchido (qualidade)
        const otherComplete = !!p.what_i_do && !!p.ideal_client && !!p.business_segment && otherTags.length > 0;
        if (otherComplete) {
          score += 10;
          reasons.push('Perfil completo');
        }

        const opportunity = analyzeMatchOpportunity(
          {
            what_i_do: me?.what_i_do,
            ideal_client: me?.ideal_client,
            business_segment: me?.business_segment,
            tags: myTags,
          },
          {
            what_i_do: p.what_i_do,
            ideal_client: p.ideal_client,
            business_segment: p.business_segment,
            tags: otherTags,
          },
          { hasIdealClientFit, hasSameSegment, hasSharedTags }
        );

        score += opportunity.partnershipScore;
        if (opportunity.partnershipScore > 0 && !reasons.includes(opportunity.opportunityTitle)) {
          reasons.unshift(opportunity.opportunityTitle);
        }

        if (score <= 0) continue;

        // tags em comum legíveis (formato original do outro perfil)
        const sharedTags = otherTags.filter((t) => myTagsNorm.includes(normalize(t)));

        suggestions.push({
          id: p.id,
          full_name: p.full_name,
          company: p.company,
          position: p.position,
          avatar_url: p.avatar_url,
          business_segment: p.business_segment,
          what_i_do: p.what_i_do,
          ideal_client: p.ideal_client,
          tags: otherTags,
          role: role || 'convidado',
          score,
          reasons,
          sharedTags,
          alreadyConnected: connectedSet.has(p.id),
          matchType: opportunity.matchType,
          partnershipScore: opportunity.partnershipScore,
          opportunityTitle: opportunity.opportunityTitle,
          opportunityDescription: opportunity.opportunityDescription,
          opportunityIdeas: opportunity.opportunityIdeas,
          serviceCategories: opportunity.serviceCategories,
          sharedAudiences: opportunity.sharedAudiences,
        });
      }

      suggestions.sort((a, b) => b.score - a.score);

      return { myProfile, suggestions };
    },
  });

  const connectionsQuery = useQuery({
    queryKey: ['matchmaking-connections', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MatchmakingConnection[]> => {
      const { data, error } = await supabase
        .from('matchmaking_connections')
        .select('id, target_id, description, created_at')
        .eq('member_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const targetIds = (data || []).map((c) => c.target_id);
      let targets: Record<string, any> = {};
      if (targetIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, company, avatar_url')
          .in('id', targetIds);
        profs?.forEach((p) => { targets[p.id] = p; });
      }
      return (data || []).map((c) => ({ ...c, target: targets[c.target_id] || null }));
    },
  });

  const createCheck = useMutation({
    mutationFn: async (input: { targetId: string; description?: string; meetingDate?: string; imageUrl?: string }) => {
      const { data, error } = await supabase.rpc('create_matchmaking_check' as any, {
        _target_id: input.targetId,
        _description: input.description || null,
        _meeting_date: input.meetingDate || new Date().toISOString().slice(0, 10),
        _image_url: input.imageUrl || null,
      });
      if (error) throw error;
      const result = data as any;
      if (result && result.success === false) {
        throw new Error(result.error || 'Erro ao registrar conexão');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchmaking'] });
      queryClient.invalidateQueries({ queryKey: ['matchmaking-connections'] });
      queryClient.invalidateQueries({ queryKey: ['gente-em-acao'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-points'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      toast({ title: 'Conexão registrada!', description: 'Gente em Ação criado e +10 pts de MatchMaking.' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e?.message || 'Não foi possível registrar a conexão', variant: 'destructive' });
    },
  });

  const suggestions = query.data?.suggestions ?? [];

  return {
    myProfile: query.data?.myProfile ?? null,
    suggestions,
    weeklySuggestion: pickWeeklySuggestion(suggestions),
    isLoading: query.isLoading,
    connections: connectionsQuery.data ?? [],
    createCheck,
  };
}
