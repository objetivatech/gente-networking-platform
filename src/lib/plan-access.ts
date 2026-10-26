/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { AppRole } from './access-control';

export const MODULE_FEATURES = {
  can_access_community_showcase: 'Vitrine da Comunidade',
  matchmaking_enabled: 'MatchMaking',
  can_create_gente_em_acao: 'Gente em Ação e agendamentos',
  can_access_referrals: 'Indicações',
  can_access_business_deals: 'Negócios',
  can_access_testimonials: 'Depoimentos',
  can_access_opportunities: 'Mural de Oportunidades',
  can_access_referral_requests: 'Pedidos de Indicação',
  can_access_feed: 'Feed',
  can_access_contents: 'Conteúdos',
  can_access_council: 'Conselho 24/7',
  can_access_meetings: 'Encontros Premium',
  public_profile_enabled: 'Página pública, cartão digital e QR Code',
  ai_pitch_enabled: 'Pitch por IA',
} as const;
export type ModuleFeature = keyof typeof MODULE_FEATURES;
export type PlanFeatures = Partial<Record<ModuleFeature, boolean>> & { matchmaking_monthly_quota?: number };
export interface Entitlements {
  subscription: { subscription_id: string; plan_name: string; audience: string; features: PlanFeatures } | null;
  has_subscription_history?: boolean;
}
export const PATH_FEATURES: Record<string, ModuleFeature> = {
  '/vitrine': 'can_access_community_showcase', '/matchmaking': 'matchmaking_enabled',
  '/gente-em-acao': 'can_create_gente_em_acao', '/indicacoes': 'can_access_referrals',
  '/negocios': 'can_access_business_deals', '/depoimentos': 'can_access_testimonials',
  '/oportunidades': 'can_access_opportunities', '/pedidos-indicacao': 'can_access_referral_requests',
  '/feed': 'can_access_feed', '/conteudos': 'can_access_contents',
  '/conselho': 'can_access_council', '/encontros': 'can_access_meetings',
};
export const PREMIUM_ONLY: ModuleFeature[] = ['public_profile_enabled', 'ai_pitch_enabled'];
export const MEMBER_ONLY: ModuleFeature[] = ['can_access_council', 'can_access_opportunities', 'can_access_referral_requests'];

/** Role is a ceiling: a plan never grants access to the member universe. */
export function hasPlanFeature(role: AppRole, feature: ModuleFeature, rights?: Entitlements | null): boolean {
  if (!role) return false;
  if (feature === 'can_access_community_showcase' && role === 'admin') return true;
  if (PREMIUM_ONLY.includes(feature)) {
    return (role === 'membro' || role === 'facilitador') &&
      ['premium', 'membro'].includes(rights?.subscription?.audience ?? '') && rights?.subscription?.features[feature] === true;
  }
  if (MEMBER_ONLY.includes(feature) && (role === 'assinante' || role === 'convidado')) return false;
  if (role === 'admin') return true;
  if (role === 'convidado') return false;
  if (!rights) return false;
  const plan = rights.subscription;
  if (feature === 'can_access_community_showcase' && role !== 'assinante') return plan?.features[feature] === true;
  if (!plan) return role !== 'assinante' && !rights.has_subscription_history;
  if (plan.features[feature] !== undefined) return plan.features[feature] === true;
  // Existing plans retain their pre-matrix modules; explicit switches always win.
  if (feature === 'matchmaking_enabled') return (plan.features.matchmaking_monthly_quota ?? 0) > 0 || role !== 'assinante';
  if (role !== 'assinante') return true;
  return ['can_access_referrals', 'can_access_business_deals', 'can_access_testimonials', 'can_access_feed', 'can_access_contents', 'can_access_community_showcase'].includes(feature);
}

export function isEligibleCommunityTarget(role: AppRole, targetRole: string | null): boolean {
  return role !== 'assinante' || targetRole === 'assinante' || targetRole === 'convidado';
}