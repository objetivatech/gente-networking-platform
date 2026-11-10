/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export function safeAsaasPaymentUrl(value: unknown, environment: string): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const hosts = environment === 'sandbox' ? ['sandbox.asaas.com'] : ['www.asaas.com', 'asaas.com'];
    return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function effectiveAsaasStatus(status: string, paidUntil: string | null, today: string): string {
  return status === 'active' && (!paidUntil || paidUntil <= today) ? 'past_due' : status;
}