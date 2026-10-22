/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export const LP_CANONICAL_ORIGIN = 'https://gentenetworking.com.br';
export const PLATFORM_ORIGIN = 'https://comunidade.gentenetworking.com.br';
export const RESERVED_SLUGS = new Set(['auth', 'redefinir-senha', 'convite', 'instalar', 'm', 'p', 'membro', 'perfil', 'feed', 'membros', 'matchmaking', 'oportunidades', 'pedidos-indicacao', 'convidados', 'aniversarios', 'estatisticas', 'gente-em-acao', 'depoimentos', 'negocios', 'indicacoes', 'equipes', 'encontros', 'conteudos', 'ranking', 'convites', 'termos-de-uso', 'politica-de-privacidade', 'politica-de-cookies', 'conselho', 'changelog', 'documentacao', 'configuracoes', 'dashboard', 'admin', '404', 'obrigado', 'lps']);
export function validateSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_SLUGS.has(slug);
}
export function canonicalForPage(slug: string): string {
  return slug === 'entrada-plataforma' ? `${PLATFORM_ORIGIN}/auth` : `${LP_CANONICAL_ORIGIN}/${slug === 'inicio' ? '' : slug}`;
}
export function previewForPage(slug: string): string {
  return slug === 'entrada-plataforma' ? '/auth' : `/lps/${slug}`;
}
export function fallbackSource(slug: string): 'lp_gentehub' | 'lp_participe' | 'lp_networking' {
  if (slug === 'gentehub') return 'lp_gentehub';
  if (['participe', 'comunidade', 'impulso'].includes(slug)) return 'lp_participe';
  return 'lp_networking';
}
export type SubmissionOutcome = { status: 'ok' } | { status: 'already_member'; message: string; loginUrl: string };
export function parseSubmission(status: number, body: Record<string, unknown>): SubmissionOutcome {
  if (status === 409 && body.already_member === true) return { status: 'already_member', message: typeof body.message === 'string' ? body.message : 'Você já faz parte do Gente.', loginUrl: `${PLATFORM_ORIGIN}/auth` };
  if (status < 200 || status >= 300 || body.ok !== true) throw new Error('Não foi possível concluir a inscrição. Tente novamente.');
  return { status: 'ok' };
}