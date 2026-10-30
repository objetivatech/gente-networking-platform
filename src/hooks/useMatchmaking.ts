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
import { useEntitlements } from './useEntitlements';
import { isEligibleCommunityTarget } from '@/lib/plan-access';
import { useToast } from '@/hooks/use-toast';
import { analyzeMatchOpportunity, type MatchType } from '@/lib/matchmaking-rules';
import { normalizeDrawState, type MatchmakingDrawState } from '@/lib/matchmaking-draw';
import { todayLocalISODate } from '@/lib/date-utils';
import { fetchConnectionDoors, useConnectionTaxonomies } from './useConnectionDoors';
import type { ConnectionDoors } from '@/lib/connection-doors';

export interface MatchSuggestion extends ConnectionDoors {
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
  /** Nº de tentativas de contato registradas (agendamento ou manual). */
  attemptsCount: number;
  /** Nº de conexões efetivas registradas com esta pessoa. */
  connectionsCount: number;
  lastConnectionAt: string | null;
  /** Data em que o contato volta a ser sugerido (fila de 60 dias). */
  cooldownUntil: string | null;
  isInCooldown: boolean;
  isReconnection: boolean;
  matchType: MatchType;
  partnershipScore: number;
  opportunityTitle: string;
  opportunityDescription: string;
  opportunityIdeas: string[];
  serviceCategories: string[];
  sharedAudiences: string[];
}

export interface MyProfileForMatch extends ConnectionDoors {
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
  /** Total de conexões efetivas com este contato. */
  totalWithTarget: number;
  /** Data em que o contato volta às sugestões (fila de 60 dias). */
  availableAt: string;
  isInCooldown: boolean;
  target?: { full_name: string; company: string | null; avatar_url: string | null } | null;
}

export type { MatchmakingDrawState };

/** Dias de fila de espera após uma conexão efetiva. */
export const MATCHMAKING_COOLDOWN_DAYS = 60;

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

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
  const pool = suggestions.filter((s) => !s.isInCooldown);
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
  { key: 'doors_open', label: 'Portas que abro' },
  { key: 'doors_seek', label: 'Portas que procuro' },
  { key: 'doors_notes', label: 'Observações sobre portas e acessos' },
];

export function useMatchmaking() {
  const { user } = useAuth();
  const { role, can, isLoading: loadingRights } = useEntitlements();
  const enabled = !loadingRights && can('matchmaking_enabled');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: taxonomies = [] } = useConnectionTaxonomies();

  const query = useQuery({
    queryKey: ['matchmaking', user?.id, taxonomies],
    enabled: !!user?.id && enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) {
        return { myProfile: null as MyProfileForMatch | null, suggestions: [] as MatchSuggestion[] };
      }

      // 1. Perfis elegíveis: o banco aplica o universo correto por papel.
      const [{ data: profiles, error: pErr }, { data: me, error: meErr }] = await Promise.all([
        supabase.rpc('get_matchmaking_profiles'),
        supabase
          .from('profiles')
          .select('id, what_i_do, ideal_client, business_segment, tags, doors_open, doors_seek, doors_notes')
          .eq('id', user.id)
          .maybeSingle(),
      ]);
      if (pErr) throw pErr;
      if (meErr) throw meErr;
      const doorsMap = await fetchConnectionDoors((profiles ?? []).map((p) => p.id));

      // 3. Conexões efetivas já realizadas pelo usuário (histórico completo)
      const { data: connections, error: cErr } = await supabase
        .from('matchmaking_connections')
        .select('target_id, created_at')
        .eq('member_id', user.id);
      if (cErr) throw cErr;

      const connectionsCountMap: Record<string, number> = {};
      const lastConnectionMap: Record<string, string> = {};
      (connections || []).forEach((c) => {
        connectionsCountMap[c.target_id] = (connectionsCountMap[c.target_id] || 0) + 1;
        if (!lastConnectionMap[c.target_id] || c.created_at > lastConnectionMap[c.target_id]) {
          lastConnectionMap[c.target_id] = c.created_at;
        }
      });

      // 4. Tentativas de contato registradas (não entram na fila de espera)
      const { data: attempts, error: aErr } = await supabase
        .from('matchmaking_attempts' as any)
        .select('target_id')
        .eq('member_id', user.id);
      if (aErr) throw aErr;
      const attemptsCountMap: Record<string, number> = {};
      ((attempts as any[]) || []).forEach((a) => {
        attemptsCountMap[a.target_id] = (attemptsCountMap[a.target_id] || 0) + 1;
      });

      const nowIso = new Date().toISOString();

      // Perfil do usuário logado
      const myTags: string[] = (me?.tags as string[] | null) || [];
      const myProfile: MyProfileForMatch | null = me
        ? {
            id: me.id,
            doors_open: me.doors_open,
            doors_seek: me.doors_seek,
            doors_notes: me.doors_notes,
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

      const queryRole = role;
      for (const p of profiles || []) {
        if (p.id === user.id) continue;
        const role = p.role;
        if (role === 'admin' || !isEligibleCommunityTarget(queryRole, role)) continue; // admins não entram no matchmaking


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
        const otherDoors = doorsMap.get(p.id);
        const otherComplete = !!p.what_i_do && !!p.ideal_client && !!p.business_segment && otherTags.length > 0
          && (otherDoors?.doors_open?.length ?? 0) > 0 && (otherDoors?.doors_seek?.length ?? 0) > 0
          && !!otherDoors?.doors_notes?.trim();
        if (otherComplete) {
          score += 10;
          reasons.push('Perfil completo');
        }

        const opportunity = analyzeMatchOpportunity(
          {
            doors_open: me?.doors_open,
            doors_seek: me?.doors_seek,
            what_i_do: me?.what_i_do,
            ideal_client: me?.ideal_client,
            business_segment: me?.business_segment,
            tags: myTags,
          },
          {
            ...doorsMap.get(p.id),
            what_i_do: p.what_i_do,
            ideal_client: p.ideal_client,
            business_segment: p.business_segment,
            tags: otherTags,
          },
          { hasIdealClientFit, hasSameSegment, hasSharedTags, taxonomies }
        );

        score += opportunity.partnershipScore;
        if (opportunity.partnershipScore > 0 && !reasons.includes(opportunity.opportunityTitle)) {
          reasons.unshift(opportunity.opportunityTitle);
        }

        if (score <= 0) reasons.push('Nova conexão na comunidade');

        // tags em comum legíveis (formato original do outro perfil)
        const sharedTags = otherTags.filter((t) => myTagsNorm.includes(normalize(t)));

        const connectionsCount = connectionsCountMap[p.id] || 0;
        const attemptsCount = attemptsCountMap[p.id] || 0;
        const lastConnectionAt = lastConnectionMap[p.id] || null;
        const cooldownUntil = lastConnectionAt
          ? addDays(lastConnectionAt, MATCHMAKING_COOLDOWN_DAYS)
          : null;
        const isInCooldown = !!cooldownUntil && cooldownUntil > nowIso;

        // Tentativas sem retorno reduzem levemente a prioridade, sem esconder o card
        const adjustedScore = Math.max(0, score - Math.min(15, attemptsCount * 5));

        suggestions.push({
          ...doorsMap.get(p.id),
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
          score: adjustedScore,
          reasons,
          sharedTags,
          alreadyConnected: connectionsCount > 0,
          attemptsCount,
          connectionsCount,
          lastConnectionAt,
          cooldownUntil,
          isInCooldown,
          isReconnection: connectionsCount > 0 && !isInCooldown,
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

  const drawStateQuery = useQuery({
    queryKey: ['matchmaking-draw-state', user?.id],
    enabled: !!user?.id && enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<MatchmakingDrawState | null> => {
      const { data, error } = await supabase.rpc('get_matchmaking_draw_state');
      if (error) throw error;
      return normalizeDrawState(data);
    },
  });

  const connectionsQuery = useQuery({
    queryKey: ['matchmaking-connections', user?.id],
    enabled: !!user?.id && enabled,
    queryFn: async (): Promise<MatchmakingConnection[]> => {
      if (!user?.id || role === 'assinante') return [];
      const { data, error } = await supabase
        .from('matchmaking_connections')
        .select('id, target_id, description, created_at')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const targetIds = (data || []).map((c) => c.target_id);
      let targets: Record<string, any> = {};
      if (targetIds.length > 0) {
        const { data: profs } = await supabase.rpc('get_matchmaking_profiles');
        profs?.forEach((p) => { targets[p.id] = p; });
      }
      const totals: Record<string, number> = {};
      (data || []).forEach((c) => { totals[c.target_id] = (totals[c.target_id] || 0) + 1; });
      const nowIso = new Date().toISOString();

      return (data || []).map((c) => {
        const availableAt = addDays(c.created_at, MATCHMAKING_COOLDOWN_DAYS);
        return {
          ...c,
          totalWithTarget: totals[c.target_id] || 1,
          availableAt,
          isInCooldown: availableAt > nowIso,
          target: targets[c.target_id] || null,
        };
      });
    },
  });

  const drawSuggestion = useMutation({
    mutationFn: async (targetId: string) => {
      const { data, error } = await supabase.rpc('draw_matchmaking_suggestion', { _target_id: targetId });
      if (error) throw error;
      const result = data as any;
      if (result && result.success === false) throw new Error(result.error || 'Franquia de MatchMaking indisponível');
      return result;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['matchmaking-draw-state', user?.id] });
      if (result?.already_drawn) {
        toast({ title: 'Contato já sorteado', description: 'Este perfil já estava na sua lista deste mês.' });
      } else {
        toast({ title: 'Nova conexão sorteada!', description: 'O perfil foi adicionado às suas sugestões deste mês.' });
      }
    },
    onError: (e: any) => {
      toast({ title: 'Franquia indisponível', description: e?.message || 'Não foi possível sortear uma nova conexão', variant: 'destructive' });
    },
  });

  const createCheck = useMutation({
    mutationFn: async (input: { targetId: string; description?: string; meetingDate?: string; imageUrl?: string }) => {
      if (role === 'assinante' || !can('can_create_gente_em_acao')) throw new Error('Ação indisponível para este papel ou plano');
      const { data, error } = await supabase.rpc('create_matchmaking_check' as any, {
        _target_id: input.targetId,
        _description: input.description || null,
        _meeting_date: input.meetingDate || todayLocalISODate(),
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

  const registerAttempt = useMutation({
    mutationFn: async (input: { targetId: string; attemptType?: 'manual' | 'schedule_request'; notes?: string }) => {
      const { data, error } = await supabase.rpc('register_matchmaking_attempt' as any, {
        _target_id: input.targetId,
        _attempt_type: input.attemptType || 'manual',
        _notes: input.notes || null,
      });
      if (error) throw error;
      const result = data as any;
      if (result && result.success === false) {
        throw new Error(result.error || 'Erro ao registrar tentativa');
      }
      return result;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['matchmaking'] });
      if (vars.attemptType !== 'schedule_request') {
        toast({ title: 'Tentativa registrada', description: 'Contamos essa tentativa de conexão.' });
      }
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e?.message || 'Não foi possível registrar a tentativa', variant: 'destructive' });
    },
  });

  const allSuggestions = query.data?.suggestions ?? [];
  // Conexões efetivas recentes ficam em fila de espera (60 dias) fora da listagem
  const suggestions = allSuggestions.filter((s) => !s.isInCooldown);

  return {
    myProfile: query.data?.myProfile ?? null,
    suggestions,
    allSuggestions,
    weeklySuggestion: pickWeeklySuggestion(suggestions),
    isLoading: query.isLoading,
    connections: connectionsQuery.data ?? [],
    drawState: drawStateQuery.data ?? null,
    isDrawStateLoading: drawStateQuery.isLoading,
    drawSuggestion,
    createCheck,
    registerAttempt,
  };
}
