/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { expect, it } from 'vitest';
import { isRecoveryAge, recoveryWhatsApp } from '../checkout-recovery';
it('recuperação exige mais de 24h completas', () => { const time = Date.parse('2026-11-14T12:00:00Z'); expect(isRecoveryAge('2026-11-13T12:00:00Z', time)).toBe(false); expect(isRecoveryAge('2026-11-13T11:59:59Z', time)).toBe(true); });
it('telefone brasileiro recebe código 55 sem duplicação', () => { expect(recoveryWhatsApp('(51) 99999-1234', 'Olá')).toBe('https://wa.me/5551999991234?text=Ol%C3%A1'); expect(recoveryWhatsApp('5551999991234', 'Olá')).toBe('https://wa.me/5551999991234?text=Ol%C3%A1'); });
it('telefone ausente ou incompleto não abre WhatsApp', () => { expect(recoveryWhatsApp(null, 'Contato')).toBeNull(); expect(recoveryWhatsApp('123', 'Contato')).toBeNull(); });