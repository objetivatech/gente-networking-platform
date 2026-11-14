/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export type PlanBadgeData = { label: string; tone: 'accent' | 'primary' | 'secondary' };
export function validCommercialTerms(capacity: string, days: string) {
 return (capacity.trim() === '' || (Number.isSafeInteger(Number(capacity)) && Number(capacity) > 0)) && Number.isSafeInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 30;
}
export function hasAvailableSeats(remaining: number | null | undefined) { return remaining == null || remaining > 0; }
