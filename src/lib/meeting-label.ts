/**
 * meeting-label - Rótulo padronizado de encontros (v3.39.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Garante que encontros sem título (ex.: Gente HUB criados sem nome) sejam
 * identificados corretamente no Feed, no card de Próximos Encontros, na página
 * de Encontros, nos Convites e no CRM.
 */

export interface MeetingLike {
  title?: string | null;
  event_type?: string | null;
  meeting_date?: string | null;
}

/** Título exibível de um encontro, com fallback por tipo de evento. */
export function meetingDisplayTitle(meeting: MeetingLike | null | undefined): string {
  const title = meeting?.title?.trim();
  if (title) return title;
  if (meeting?.event_type === 'hub_event') return 'Encontro Gente HUB';
  return 'Encontro';
}
