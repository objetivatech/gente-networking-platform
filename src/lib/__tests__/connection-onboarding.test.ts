/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, it, expect } from 'vitest';
import { requiresConnectionVideo, watchedDelta } from '../connection-onboarding';
describe('vídeo obrigatório Gente Conexões', () => {
  it('persiste a obrigação enquanto a pessoa não conclui', () => {
    expect(requiresConnectionVideo('assinante', true, null)).toBe(true);
    expect(requiresConnectionVideo('assinante', true, '2026-11-14T18:00:00Z')).toBe(false);
  });
  it('desabilitar pelo Admin remove a obrigação', () => {
    expect(requiresConnectionVideo('assinante', false, null)).toBe(false);
  });
  it('não bloqueia os demais papéis', () => {
    for (const role of ['admin', 'facilitador', 'membro', 'convidado']) expect(requiresConnectionVideo(role, true)).toBe(false);
  });
  it('não computa tempo pausado ou página oculta', () => {
    expect(watchedDelta(5, false, true)).toBe(0);
    expect(watchedDelta(5, true, false)).toBe(0);
    expect(watchedDelta(5, true, true)).toBe(5);
  });
});