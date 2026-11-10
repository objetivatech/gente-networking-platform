/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
/** Authentication succeeds only with the shared provider token. */
export function webhookGate(expected: string | null, supplied: string | null): 200 | 401 | 503 {
  if (!expected) return 503;
  if (!supplied) return 401;
  const encoder = new TextEncoder();
  const a = encoder.encode(expected);
  const b = encoder.encode(supplied);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0 ? 200 : 401;
}

export function paymentState(status: string): 'paid' | 'pending' | 'overdue' | 'refunded' | 'canceled' | null {
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) return 'paid';
  if (status === 'OVERDUE') return 'overdue';
  if (['REFUNDED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'].includes(status)) return 'refunded';
  if (status === 'DELETED') return 'canceled';
  if (['PENDING', 'AWAITING_RISK_ANALYSIS'].includes(status)) return 'pending';
  return null;
}