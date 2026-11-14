/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export function requiresConnectionVideo(role: string | null | undefined, enabled: boolean, completedAt?: string | null): boolean {
  return role === 'assinante' && enabled && !completedAt;
}
export function watchedDelta(elapsed: number, playing: boolean, visible: boolean): number {
  return playing && visible ? Math.min(30, Math.max(0, Math.floor(elapsed))) : 0;
}