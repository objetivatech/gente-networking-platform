/**
 * matchmaking-draw - Regras puras da franquia mensal do MatchMaking.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

export interface MatchmakingDrawState {
  year_month: string;
  renewal_date: string | null;
  quota: number | null;
  used: number;
  remaining: number | null;
  metered: boolean;
  can_draw: boolean;
  reason: string | null;
  target_ids: string[];
  plan_name?: string | null;
}

export interface DrawableSuggestion {
  id: string;
}

/**
 * A sugestão semanal é orgânica e nunca consome franquia. Somente perfis
 * presentes no ledger mensal entram na lista de sorteados.
 */
export function resolveMatchmakingDraws<T extends DrawableSuggestion>(
  suggestions: T[],
  weeklySuggestionId: string | null | undefined,
  drawnTargetIds: string[],
  showAll: boolean,
): { visible: T[]; nextCandidate: T | null } {
  if (showAll) return { visible: suggestions, nextCandidate: null };

  const drawn = new Set(drawnTargetIds);
  const visible = suggestions.filter((s) => s.id !== weeklySuggestionId && drawn.has(s.id));
  const nextCandidate = suggestions.find((s) => s.id !== weeklySuggestionId && !drawn.has(s.id)) ?? null;
  return { visible, nextCandidate };
}

export function normalizeDrawState(raw: any): MatchmakingDrawState | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    year_month: String(raw.year_month ?? ''),
    renewal_date: raw.renewal_date ?? null,
    quota: typeof raw.quota === 'number' ? raw.quota : null,
    used: typeof raw.used === 'number' ? raw.used : 0,
    remaining: typeof raw.remaining === 'number' ? raw.remaining : null,
    metered: raw.metered === true,
    can_draw: raw.can_draw === true,
    reason: raw.reason ?? null,
    target_ids: Array.isArray(raw.target_ids) ? raw.target_ids.map(String) : [],
    plan_name: raw.plan_name ?? null,
  };
}
