/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
/** No successful acknowledgment before transactional financial processing exists. */
export function webhookGate(expected: string | null, supplied: string | null): 401 | 503 {
  if (!expected) return 503;
  if (!supplied) return 401;
  const encoder = new TextEncoder();
  const a = encoder.encode(expected);
  const b = encoder.encode(supplied);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0 ? 503 : 401;
}