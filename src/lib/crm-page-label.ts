/**
 * crm-page-label - Normalização visual das páginas de captação do CRM (v3.35.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * As LPs enviam títulos crus do tipo "hub | location=pais | referral=outro".
 * Aqui separamos o nome legível dos parâmetros de rastreio, para que todas as
 * origens fiquem com a mesma apresentação de "Quero Participar".
 */

const FRIENDLY_NAMES: Record<string, string> = {
  hub: 'Gente HUB',
  gentehub: 'Gente HUB',
  participe: 'Quero Participar',
  networking: 'Gente Networking',
  comunidade: 'Comunidade Gente',
};

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export interface CrmPageLabel {
  /** Nome legível da página. */
  label: string;
  /** Parâmetros de rastreio (location, referral, grupo...). */
  params: { key: string; value: string }[];
}

/** Converte título bruto + URL numa apresentação padronizada. */
export function formatLeadPageLabel(
  rawTitle: string | null | undefined,
  pageUrl?: string | null,
): CrmPageLabel {
  const params: { key: string; value: string }[] = [];
  const parts = (rawTitle ?? '').split('|').map((p) => p.trim()).filter(Boolean);

  let head = parts.shift() ?? '';
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    const v = rest.join('=').trim();
    if (v) params.push({ key: k.trim(), value: v });
    else params.push({ key: 'info', value: part });
  }

  if (!head && pageUrl) {
    try {
      const url = new URL(pageUrl);
      head = (url.hash?.replace('#', '') || url.pathname.split('/').filter(Boolean).pop() || url.hostname);
    } catch {
      head = pageUrl;
    }
  }

  const key = head.toLowerCase().replace(/[^a-z]/g, '');
  const label = FRIENDLY_NAMES[key] ?? (head ? titleCase(head) : 'Página sem título');

  return { label, params };
}
