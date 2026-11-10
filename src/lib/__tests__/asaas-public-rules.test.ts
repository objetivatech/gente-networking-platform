/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { safeAsaasPaymentUrl, effectiveAsaasStatus } from '../../../supabase/functions/_shared/asaas-public-rules';
describe('Asaas payment boundaries', () => {
  it('allows only the production payment origin', () => { expect(safeAsaasPaymentUrl('https://www.asaas.com/i/fixture', 'production')).toBe('https://www.asaas.com/i/fixture'); expect(safeAsaasPaymentUrl('https://evil.example/i/fixture', 'production')).toBeNull(); });
  it('never mixes sandbox and production', () => { expect(safeAsaasPaymentUrl('https://sandbox.asaas.com/i/fixture', 'production')).toBeNull(); expect(safeAsaasPaymentUrl('https://www.asaas.com/i/fixture', 'sandbox')).toBeNull(); });
  it('blocks insecure URLs and embedded credentials', () => { expect(safeAsaasPaymentUrl('http://www.asaas.com', 'production')).toBeNull(); expect(safeAsaasPaymentUrl('https://fixture@www.asaas.com', 'production')).toBeNull(); });
  it('expires the paid period on the due date without a recurring job', () => { expect(effectiveAsaasStatus('active', '2026-11-10', '2026-11-10')).toBe('past_due'); expect(effectiveAsaasStatus('active', '2026-11-11', '2026-11-10')).toBe('active'); });
  it('never activates draft or canceled subscriptions', () => { expect(effectiveAsaasStatus('draft', '2026-11-11', '2026-11-10')).toBe('draft'); expect(effectiveAsaasStatus('canceled', '2026-11-11', '2026-11-10')).toBe('canceled'); });
});