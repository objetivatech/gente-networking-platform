/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { webhookGate } from '../../../supabase/functions/_shared/asaas-webhook-rules';

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
  it('keeps authenticated events retryable until processing is implemented', () => {
    expect(webhookGate('fixture-expected', 'fixture-expected')).toBe(503);
  });
});