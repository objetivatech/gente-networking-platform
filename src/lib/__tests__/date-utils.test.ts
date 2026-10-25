/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { formatDateBR, todayLocalISODate } from '@/lib/date-utils';

describe('todayLocalISODate', () => {
  it('retorna a data no formato YYYY-MM-DD', () => {
    expect(todayLocalISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('usa o horário de Brasília, não UTC', () => {
    // 01:30 UTC = 22:30 do dia anterior em São Paulo (UTC-3, sem horário de verão).
    const utc = new Date('2026-10-25T01:30:00Z');
    const expected = utc.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    expect(expected).toBe('2026-10-24');
  });
});

describe('formatDateBR', () => {
  it('formata data ISO como DD/MM/AAAA', () => {
    expect(formatDateBR('2026-10-24')).toBe('24/10/2026');
  });

  it('formata timestamp completo usando apenas a parte da data', () => {
    expect(formatDateBR('2026-10-24T22:13:00+00:00')).toBe('24/10/2026');
  });

  it('retorna vazio para valores ausentes', () => {
    expect(formatDateBR(null)).toBe('');
    expect(formatDateBR(undefined)).toBe('');
    expect(formatDateBR('')).toBe('');
  });

  it('devolve o valor original quando não é uma data ISO', () => {
    expect(formatDateBR('em breve')).toBe('em breve');
  });
});
