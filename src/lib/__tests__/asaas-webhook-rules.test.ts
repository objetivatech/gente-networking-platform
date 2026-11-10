/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { webhookGate, paymentState } from '../../../supabase/functions/_shared/asaas-webhook-rules';

describe('Asaas provisioning gate with synthetic fixtures', () => {
  it('does not acknowledge events before configuration', () => {
    expect(webhookGate(null, null)).toBe(503);
  });
  it('rejects absent authentication', () => {
    expect(webhookGate('fixture-expected', null)).toBe(401);
  });
  it('rejects incorrect authentication', () => {
    expect(webhookGate('fixture-expected', 'fixture-invalid')).toBe(401);
  });
  it('accepts only matching authentication', () => {
    expect(webhookGate('fixture-expected', 'fixture-expected')).toBe(200);
  });
  it('creation never confirms payment', () => { expect(paymentState('PENDING')).toBe('pending'); });
  it('confirmation is financial, not a callback', () => { expect(paymentState('CONFIRMED')).toBe('paid'); expect(paymentState('RECEIVED')).toBe('paid'); expect(paymentState('CALLBACK')).toBeNull(); });
  it('overdue suspends paid access without deleting history', () => { expect(paymentState('OVERDUE')).toBe('overdue'); });
  it('refund and chargeback revoke the disputed period', () => { expect(paymentState('REFUNDED')).toBe('refunded'); expect(paymentState('CHARGEBACK_REQUESTED')).toBe('refunded'); });
});