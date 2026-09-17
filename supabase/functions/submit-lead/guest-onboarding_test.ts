/**
 * Testes das categorias de ativação de convidados.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { classifyOnboardingCategory } from "../_shared/guest-onboarding.ts";

Deno.test("classifica todas as origens e mantém fallback", () => {
  assertEquals(classifyOnboardingCategory("lp_gentehub"), "gente_hub");
  assertEquals(classifyOnboardingCategory("lp_participe", "Programa Impulso"), "impulso");
  assertEquals(classifyOnboardingCategory("lp_participe", "Comunidade WhatsApp"), "comunidade");
  assertEquals(classifyOnboardingCategory("lp_participe"), "participe");
  assertEquals(classifyOnboardingCategory("site_elementor"), "site");
  assertEquals(classifyOnboardingCategory("api", "origem futura"), "outra_origem");
});