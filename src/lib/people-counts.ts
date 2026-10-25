/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { AppRole } from './access-control';
export const PEOPLE_ROLES = ['admin', 'facilitador', 'membro', 'assinante', 'convidado'] as const;
export function primaryRole(roles: readonly string[]): AppRole {
  return PEOPLE_ROLES.find(role => roles.includes(role)) ?? null;
}
export function countPeople(people: { id: string; role: AppRole; is_active: boolean }[], pendingCount: number) {
  const unique = [...new Map(people.map(p => [p.id, p])).values()];
  const active = unique.filter(p => p.is_active);
  return {
    total: unique.length + pendingCount,
    admin: active.filter(p => p.role === 'admin').length,
    facilitador: active.filter(p => p.role === 'facilitador').length,
    membro: active.filter(p => p.role === 'membro').length,
    assinante: active.filter(p => p.role === 'assinante').length,
    convidado: active.filter(p => p.role === 'convidado' || !p.role).length + pendingCount,
    inactive: unique.filter(p => !p.is_active).length,
  };
}