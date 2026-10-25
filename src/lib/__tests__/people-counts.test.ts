/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { countPeople, primaryRole } from '../people-counts';
describe('Contadores por papel', () => {
  it('Convidados incluem 126 contas e 438 cadastros aguardando ativação', () => {
    const profiles = Array.from({ length: 126 }, (_, index) => ({ id: String(index), role: 'convidado' as const, is_active: true }));
    expect(countPeople(profiles, 438).convidado).toBe(564);
  });
  it('Assinante não é contado como Membro', () => {
    const stats = countPeople([{ id: 's', role: 'assinante', is_active: true }], 0);
    expect(stats.assinante).toBe(1); expect(stats.membro).toBe(0);
  });
  it('Papel prioritário não depende da ordem recebida', () => {
    expect(primaryRole(['convidado', 'assinante'])).toBe('assinante');
    expect(primaryRole(['assinante', 'convidado'])).toBe('assinante');
  });
  it('Inativos ficam separados dos papéis ativos', () => {
    const stats = countPeople([{ id: 'm', role: 'membro', is_active: false }], 0);
    expect(stats.inactive).toBe(1); expect(stats.membro).toBe(0); expect(stats.total).toBe(1);
  });
});