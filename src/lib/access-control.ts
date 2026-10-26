/**
 * access-control - Matriz central de permissões por role.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Centraliza regras de acesso para evitar regressões em mudanças futuras.
 * Toda nova permissão crítica deve ser registrada aqui e coberta por teste.
 */

export type AppRole = 'admin' | 'facilitador' | 'membro' | 'convidado' | 'assinante' | null | undefined;

const isOneOf = (role: AppRole, allowed: ReadonlyArray<Exclude<AppRole, null | undefined>>) =>
  !!role && (allowed as readonly string[]).includes(role);

/** Quem pode ver o diretório de convidados (/convidados). */
export const canViewGuestsDirectory = (role: AppRole): boolean =>
  isOneOf(role, ['admin', 'facilitador', 'membro']);

/** Quem pode gerenciar convidados (promover, transferir, mover presença). */
export const canManageGuests = (role: AppRole): boolean =>
  isOneOf(role, ['admin', 'facilitador']);

/** Quem pode ver o diretório de membros (/membros). */
export const canViewMembersDirectory = (role: AppRole): boolean =>
  isOneOf(role, ['admin', 'facilitador', 'membro']);

/** Quem pode acessar áreas administrativas. */
export const canAccessAdminArea = (role: AppRole): boolean =>
  isOneOf(role, ['admin', 'facilitador']);

/** Quem pode acessar áreas exclusivas do admin. */
export const isAdminOnly = (role: AppRole): boolean => role === 'admin';

/**
 * Quem pode rebaixar um membro para convidado (saída do Gente preservando histórico).
 * Apenas admin. Facilitadores e membros NÃO podem.
 */
export const canDowngradeMember = (role: AppRole): boolean => role === 'admin';

/**
 * Quem pode acessar o MatchMaking. Assinantes entram pela franquia do plano;
 * convidados NÃO acessam.
 */
export const canUseMatchmaking = (role: AppRole): boolean =>
  isOneOf(role, ['admin', 'facilitador', 'membro', 'assinante']);

/** Acesso à Vitrine: Assinante/Admin; Membro/Facilitador mediante plano. Convidados são contatos, não leitores. */
export const canAccessCommunityShowcase = (role: AppRole, planAllowed = false): boolean =>
  isOneOf(role, ['admin', 'assinante']) || (planAllowed && isOneOf(role, ['membro', 'facilitador']));

/**
 * Quem pode acessar o Mural de Oportunidades (publicar/ver oportunidades).
 * Membros, facilitadores e admins. Convidados NÃO acessam.
 */
export const canUseOpportunityBoard = (role: AppRole): boolean =>
  isOneOf(role, ['admin', 'facilitador', 'membro']);

/**
 * Quem pode acessar os Pedidos de Indicação (broadcast) e responder a eles.
 * Membros, facilitadores e admins. Convidados NÃO acessam.
 */
export const canUseReferralRequests = (role: AppRole): boolean =>
  isOneOf(role, ['admin', 'facilitador', 'membro']);

/**
 * Quem pode acessar a Central de Resgate (réguas de e-mail para ex-membros e convidados).
 * Apenas admin — é uma ferramenta de gestão/marketing, não de networking.
 */
export const canManageRescue = (role: AppRole): boolean => role === 'admin';

/* ------------------------------------------------------------------ */
/* Bloco 2 · Fase 2 — Catraca do Assinante da Comunidade              */
/* ------------------------------------------------------------------ */

/** Assinante da Comunidade: acesso por assinatura, sem mecânicas de Membros. */
export const isSubscriberRole = (role: AppRole): boolean => role === 'assinante';

/**
 * Rotas internas liberadas ao Assinante. Tudo o que não estiver aqui
 * (Membros, Convidados, MatchMaking, Encontros, Conselho, Estatísticas,
 * Ranking, Convites, Oportunidades, Pedidos, Documentação, Admin…) é bloqueado.
 * O banco filtra os dados exibidos nestas rotas para Assinantes/Convidados.
 */
export const SUBSCRIBER_ALLOWED_PATHS: ReadonlyArray<string> = [
  '/', '/feed', '/perfil', '/vitrine', '/matchmaking', '/gente-em-acao', '/indicacoes', '/negocios',
  '/depoimentos', '/conteudos', '/configuracoes',
  '/termos-de-uso', '/politica-de-privacidade', '/politica-de-cookies',
];

/** Decide se o papel pode abrir a rota interna informada. */
export const canAccessAppPath = (role: AppRole, pathname: string): boolean => {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (role === 'convidado' && normalized === '/vitrine') return false;
  if (!isSubscriberRole(role)) return true; // demais papéis mantêm as regras atuais
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SUBSCRIBER_ALLOWED_PATHS.includes(path);
};
