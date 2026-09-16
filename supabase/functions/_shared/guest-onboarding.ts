/**
 * Regras compartilhadas da jornada de ativação de convidados (v3.48.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
export const ONBOARDING_CATEGORIES = [
  "gente_hub",
  "impulso",
  "comunidade",
  "participe",
  "site",
  "outra_origem",
] as const;

export type OnboardingCategory = typeof ONBOARDING_CATEGORIES[number];

export function classifyOnboardingCategory(
  source: string,
  sourceDetail?: string | null,
  pageUrl?: string | null,
  pageTitle?: string | null,
): OnboardingCategory {
  const context = `${sourceDetail ?? ""} ${pageUrl ?? ""} ${pageTitle ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (source === "lp_gentehub" || context.includes("gente hub")) return "gente_hub";
  if (context.includes("impulso")) return "impulso";
  if (context.includes("comunidade")) return "comunidade";
  if (source === "lp_participe" || context.includes("participe")) return "participe";
  if (source === "site_elementor" || context.includes("gentenetworking.com.br")) return "site";
  if (source === "lp_networking") return "comunidade";
  return "outra_origem";
}

export const ONBOARDING_SUBJECTS: Record<OnboardingCategory, string> = {
  gente_hub: "Continue sua jornada no Gente HUB",
  impulso: "Continue sua jornada no Gente Impulso",
  comunidade: "Ative seu acesso à Comunidade Gente",
  participe: "Seu próximo passo no Gente Networking",
  site: "Bem-vindo(a) ao Gente Networking",
  outra_origem: "Ative seu acesso ao Gente Networking",
};