/**
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { describe, it, expect } from 'vitest';
import { buildReinviteMessage, toWhatsAppDigits } from './reinvite-message';

describe('reconvite', () => {
  it('normaliza WhatsApp brasileiro com DDI 55', () => {
    expect(toWhatsAppDigits('(51) 99999-8888')).toBe('5551999998888');
    expect(toWhatsAppDigits('123')).toBeNull();
  });
  it('mensagem usa data DD/MM/AAAA e horário HH:MM', () => {
    const msg = buildReinviteMessage({ guestName: 'Ana Souza', teamName: 'Conecte', meetingDate: '2026-11-05', meetingTime: '08:30:00' });
    expect(msg).toContain('Olá Ana!');
    expect(msg).toContain('Grupo Conecte');
    expect(msg).toContain('05/11/2026 às 08:30');
  });
});
