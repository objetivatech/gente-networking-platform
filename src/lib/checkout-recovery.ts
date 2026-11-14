/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export function isRecoveryAge(createdAt: string, now: number) {
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && now - created > 24 * 60 * 60 * 1000;
}
export function recoveryWhatsApp(phone: string | null, message: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^55\d{10,11}$/.test(normalized) ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null;
}