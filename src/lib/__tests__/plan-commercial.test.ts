/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { hasAvailableSeats, validCommercialTerms } from '../plan-commercial';
import { effectiveAsaasStatus } from '../../../supabase/functions/_shared/asaas-public-rules';
describe('commercial plan rules', () => {
 it('supports the seven day trial default', () => expect(validCommercialTerms('', '7')).toBe(true));
 it('validates one to thirty trial days', () => { expect(validCommercialTerms('', '0')).toBe(false); expect(validCommercialTerms('', '31')).toBe(false); expect(validCommercialTerms('', '1')).toBe(true); expect(validCommercialTerms('', '30')).toBe(true); });
 it('requires positive whole seat limits or unlimited', () => { expect(validCommercialTerms('100','7')).toBe(true); expect(validCommercialTerms('0','7')).toBe(false); expect(validCommercialTerms('1.5','7')).toBe(false); });
 it('blocks a sold out offer', () => { expect(hasAvailableSeats(0)).toBe(false); expect(hasAvailableSeats(1)).toBe(true); expect(hasAvailableSeats(null)).toBe(true); });
 it('expires active trial access on its final date', () => { expect(effectiveAsaasStatus('active','2026-11-21','2026-11-21')).toBe('past_due'); expect(effectiveAsaasStatus('active','2026-11-21','2026-11-20')).toBe('active'); });
});
