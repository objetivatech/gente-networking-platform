/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { AdvancedContent } from '../components/landing/CommunityLandingPage';
export const ENTRY_SECTIONS = ['hero', 'ecosystem', 'benefits', 'reasons', 'faq'] as const;
export const ENTRY_DEFAULTS: AdvancedContent = {
  hero: { title: 'Gente Networking', subtitle: 'Conectando pessoas, gerando negócios.', buttonText: 'Conheça o Gente', imageUrl: '/lp-entry-networking.png' },
  ecosystem: { title: 'Um ecossistema de conexões', subtitle: 'Relacionamentos que acompanham o seu negócio.', steps: [
    { title: 'Gente Comunidade', subtitle: 'O primeiro passo para novas conexões.', description: 'Amplie sua rede e participe da Comunidade Gente.', badge: 'Conheça a Comunidade', buttonLink: 'https://gentenetworking.com.br/comunidade' },
    { title: 'Gente HUB', subtitle: 'Encontros que aproximam pessoas.', description: 'Conheça o evento Gente HUB e as oportunidades de networking.', badge: 'Conheça o Gente HUB', buttonLink: 'https://gentenetworking.com.br/gentehub' },
    { title: 'Grupos Premium', subtitle: 'Master, Conecte e Impulso.', description: 'Relacionamentos recorrentes para fortalecer conexões, indicações e oportunidades de negócios.', badge: 'Conheça os Grupos', buttonLink: 'https://gentenetworking.com.br/participe' },
  ] },
  benefits: { title: 'A plataforma Gente', subtitle: 'Seu perfil, seus contatos e suas conexões.', cards: [] },
  reasons: { title: 'Dinâmicas que conectam', reasons: [{ title: 'Gente em Ação', description: 'Conexões individuais para conhecer outros profissionais.' }, { title: 'Indicações e negócios', description: 'Relacionamentos que geram novas oportunidades.' }] },
  faq: { title: 'Dúvidas frequentes', faqs: [{ question: 'Já tenho uma conta. Como entrar?', answer: 'Acesse sua conta pelo botão Entrar.' }, { question: 'Como conhecer as formas de participar?', answer: 'Explore Comunidade, Gente HUB e Grupos Premium.' }] },
};
export function entryContent(saved: AdvancedContent): AdvancedContent {
  const result: AdvancedContent = {};
  for (const key of ENTRY_SECTIONS) Object.assign(result, { [key]: { ...ENTRY_DEFAULTS[key], ...saved[key] } });
  return result;
}