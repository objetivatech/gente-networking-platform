/**
 * identity-utils - Regras puras de identidade única, convites e visibilidade de convidados (v3.47.0).
 *
 * Funções sem dependência de rede para permitir testes de regressão dos fluxos
 * de convite, confirmação de presença e desativação.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */

/** Telefone normalizado: só dígitos, últimos 11 (padrão BR sem DDI). */
export function normalizePhoneKey(value?: string | null): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits.slice(-11);
}

/** Chave de deduplicação: e-mail normalizado OU telefone normalizado. */
export function buildIdentityKeys(input: { email?: string | null; phone?: string | null }) {
  const email = (input.email ?? '').trim().toLowerCase() || null;
  return { email, phoneDigits: normalizePhoneKey(input.phone) };
}

/** Duas identidades são a mesma pessoa quando e-mail OU telefone coincidem. */
export function isSameIdentity(
  a: { email?: string | null; phone?: string | null },
  b: { email?: string | null; phone?: string | null },
): boolean {
  const ka = buildIdentityKeys(a);
  const kb = buildIdentityKeys(b);
  if (ka.email && kb.email && ka.email === kb.email) return true;
  if (ka.phoneDigits && kb.phoneDigits && ka.phoneDigits === kb.phoneDigits) return true;
  return false;
}

/**
 * Prioridade do código de convite: URL > localStorage > user_metadata.
 * O código sempre vence a correspondência por e-mail (bug de atribuição v3.45.0).
 */
export function resolveInviteCode(sources: {
  urlCode?: string | null;
  storedCode?: string | null;
  metadataCode?: string | null;
}): string | null {
  const candidates = [sources.urlCode, sources.storedCode, sources.metadataCode];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export interface GuestInvitationRow {
  id: string;
  invited_by: string | null;
  team_id?: string | null;
  event_id?: string | null;
  metadata?: unknown;
}

export interface GuestVisibility<T extends GuestInvitationRow> {
  primary: T | null;
  allowedTeamIds: string[];
  eventIds: string[];
  inviterIds: string[];
}

/**
 * Consolida a visibilidade de um convidado a partir de TODOS os convites aceitos.
 * Considera snapshot (metadata.allowed_team_ids), grupo do convite e evento HUB.
 */
export function resolveGuestVisibility<T extends GuestInvitationRow>(
  invitations: T[] | null | undefined,
): GuestVisibility<T> {
  const rows = invitations ?? [];
  if (rows.length === 0) {
    return { primary: null, allowedTeamIds: [], eventIds: [], inviterIds: [] };
  }

  const teams = new Set<string>();
  const events = new Set<string>();
  const inviters = new Set<string>();

  for (const inv of rows) {
    const metadata = (inv.metadata ?? null) as Record<string, unknown> | null;
    const snapshot = metadata?.allowed_team_ids;
    if (Array.isArray(snapshot)) {
      snapshot.forEach((id) => typeof id === 'string' && id && teams.add(id));
    }
    if (inv.team_id) teams.add(inv.team_id);
    if (inv.event_id) events.add(inv.event_id);
    if (inv.invited_by) inviters.add(inv.invited_by);
  }

  return {
    primary: rows[0],
    allowedTeamIds: Array.from(teams),
    eventIds: Array.from(events),
    inviterIds: Array.from(inviters),
  };
}

/**
 * Argumentos da RPC `deactivate_member`. Centralizado para evitar troca de ordem
 * ou nome de parâmetro (causa do erro `add_activity_feed(...) does not exist`).
 */
export function buildDeactivateArgs(memberId: string, reason?: string | null) {
  return { _member_id: memberId, _reason: reason && reason.trim() ? reason.trim() : null };
}
