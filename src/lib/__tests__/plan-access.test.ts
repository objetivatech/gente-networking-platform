/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { hasPlanFeature, isEligibleCommunityTarget, type Entitlements } from '../plan-access';
const rights: Entitlements = { subscription: { subscription_id: 's', audience: 'assinante', plan_name: 'Teste', features: { matchmaking_enabled: true, matchmaking_monthly_quota: 3, can_create_gente_em_acao: true } } };
describe('Plano e papel separados', () => {
  it('Assinante com plano acessa MatchMaking', () => expect(hasPlanFeature('assinante', 'matchmaking_enabled', rights)).toBe(true));
  it('Assinante sem assinatura não acessa MatchMaking', () => expect(hasPlanFeature('assinante', 'matchmaking_enabled', { subscription: null })).toBe(false));
  it('Desligar MatchMaking prevalece sobre franquia positiva', () => expect(hasPlanFeature('assinante', 'matchmaking_enabled', { subscription: { ...rights.subscription, subscription_id: 's', plan_name: 'Teste', audience: 'assinante', features: { matchmaking_enabled: false, matchmaking_monthly_quota: 3 } } })).toBe(false));
  it('Assinante agenda Gente em Ação conforme o plano', () => expect(hasPlanFeature('assinante', 'can_create_gente_em_acao', rights)).toBe(true));
  it('Plano não concede Conselho ao Assinante', () => expect(hasPlanFeature('assinante', 'can_access_council', rights)).toBe(false));
  it('Admin acessa vitrine sem plano', () => expect(hasPlanFeature('admin', 'can_access_community_showcase')).toBe(true));
  it('Membro não acessa vitrine por padrão', () => expect(hasPlanFeature('membro', 'can_access_community_showcase', { subscription: null })).toBe(false));
  it('Membro com plano liberado acessa vitrine', () => expect(hasPlanFeature('membro', 'can_access_community_showcase', { subscription: { ...rights.subscription, subscription_id: 's', plan_name: 'Teste', audience: 'premium', features: { can_access_community_showcase: true } } })).toBe(true));
  it('Assinante nunca recebe Membro como candidato', () => expect(isEligibleCommunityTarget('assinante', 'membro')).toBe(false));
  it('Assinante recebe Convidado como candidato', () => expect(isEligibleCommunityTarget('assinante', 'convidado')).toBe(true));
  it('Membro Premium pode gerar pitch quando liberado', () => expect(hasPlanFeature('membro', 'ai_pitch_enabled', { subscription: { subscription_id: 's', plan_name: 'Premium', audience: 'premium', features: { ai_pitch_enabled: true } } })).toBe(true));
  it('Assinante nunca gera pitch Premium mesmo com flag', () => expect(hasPlanFeature('assinante', 'ai_pitch_enabled', { subscription: { subscription_id: 's', plan_name: 'Teste', audience: 'assinante', features: { ai_pitch_enabled: true } } })).toBe(false));
  it('Membro com assinatura cancelada não retoma acesso legado', () => expect(hasPlanFeature('membro', 'can_create_gente_em_acao', { subscription: null, has_subscription_history: true })).toBe(false));
});