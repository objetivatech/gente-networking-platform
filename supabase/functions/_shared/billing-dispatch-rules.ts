/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export function canDispatchCharge(subscriptionStatus: string, planActive: boolean): boolean {
  return planActive && ['draft', 'active', 'past_due'].includes(subscriptionStatus);
}
export function reuseCharge(existingStatus: string | null, force: boolean): 'paid' | 'open' | 'send' {
  if (existingStatus === 'paid') return 'paid';
  if (['pending', 'sent'].includes(existingStatus ?? '') && !force) return 'open';
  return 'send';
}