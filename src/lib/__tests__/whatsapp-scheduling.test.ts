/**
 * Testes do envio assistido por WhatsApp no agendamento do Gente em Ação.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { describe, expect, it } from 'vitest';
import {
  buildSchedulingWhatsAppMessage,
  buildSchedulingWhatsAppUrl,
  normalizeBrazilianWhatsAppPhone,
  SCHEDULING_PUBLIC_URL,
} from '@/lib/whatsapp-scheduling';

describe('WhatsApp do agendamento', () => {
  it('normaliza celular e telefone fixo brasileiros com DDI 55', () => {
    expect(normalizeBrazilianWhatsAppPhone('(51) 99999-8888')).toBe('5551999998888');
    expect(normalizeBrazilianWhatsAppPhone('(55) 99999-8888')).toBe('5555999998888');
    expect(normalizeBrazilianWhatsAppPhone('+55 51 3216-5232')).toBe('555132165232');
    expect(normalizeBrazilianWhatsAppPhone('005551999998888')).toBe('5551999998888');
  });

  it('rejeita telefone ausente, curto ou internacional não brasileiro', () => {
    expect(normalizeBrazilianWhatsAppPhone(null)).toBeNull();
    expect(normalizeBrazilianWhatsAppPhone('1234')).toBeNull();
    expect(normalizeBrazilianWhatsAppPhone('+1 202 555 0100')).toBeNull();
  });

  it('monta a mensagem aprovada com o domínio público', () => {
    const message = buildSchedulingWhatsAppMessage({
      recipientName: 'Maria', requesterName: 'João',
      proposedStart: '2026-09-25T14:00:00-03:00', durationMinutes: 60,
      location: 'Online — Google Meet',
    });
    expect(message).toContain('Olá, Maria!');
    expect(message).toContain('Sou João');
    expect(message).toContain('25/09/2026');
    expect(message).toContain('1 hora');
    expect(message).toContain(SCHEDULING_PUBLIC_URL);
  });

  it('codifica telefone e mensagem na URL wa.me', () => {
    expect(buildSchedulingWhatsAppUrl('5551999998888', 'Olá, Maria!'))
      .toBe('https://wa.me/5551999998888?text=Ol%C3%A1%2C%20Maria!');
  });
});
