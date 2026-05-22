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

export type AppRole = 'admin' | 'facilitador' | 'membro' | 'convidado' | null | undefined;

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
