/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { AdvancedContent } from '../components/landing/CommunityLandingPage';
import { SUBSCRIBER_DEFAULTS } from './entry-content';

// Presentation only: checkout remains separate from editorial/lead forms.
export const CONNECTION_SECTIONS = ['hero', 'authority', 'problem', 'benefits', 'ecosystem', 'audience', 'testimonials', 'reasons', 'offer', 'faq'] as const;
export const CONNECTION_DEFAULTS: AdvancedContent = {
  ...SUBSCRIBER_DEFAULTS,
  hero: { ...SUBSCRIBER_DEFAULTS.hero, buttonText: 'Conhecer os planos', subtitle: 'Seja conhecido pelo que você faz. Encontre profissionais, descubra quem pode abrir portas e transforme boas conversas em novas possibilidades de negócio.', highlights: ['Vitrine exclusiva', 'Afinidades e portas de conexão', 'Relacionamentos que continuam'] },
  problem: { title: 'Ser excelente no que faz não é suficiente.', subtitle: 'Para alguém indicar o seu trabalho, primeiro precisa conhecer você. Uma rede ativa aproxima sua experiência de quem procura o que você oferece.', points: ['Mostre o que faz e o valor que pode entregar.', 'Encontre pessoas com interesses e públicos em comum.', 'Continue a conversa depois do primeiro encontro.'], callout: 'Pessoas indicam quem conhecem e em quem confiam.', calloutSubtitle: 'Sua próxima oportunidade pode começar com uma conexão.' },
  benefits: { ...SUBSCRIBER_DEFAULTS.benefits, cards: [
    ...(SUBSCRIBER_DEFAULTS.benefits?.cards ?? []),
    { title: 'Portas de conexão', description: 'Apresente os públicos a que você tem acesso e as conexões que procura. Parcerias também podem nascer entre profissionais da mesma área.', icon: 'handshake' },
    { title: 'Agenda de encontros', description: 'Conheça os próximos eventos. Para confirmar participação, é necessário um convite específico para o encontro, inclusive Gente HUB.', icon: 'calendar' },
  ] },
  ecosystem: { title: 'Conexões que acompanham sua jornada.', subtitle: 'Comece na plataforma, conheça os encontros e aprofunde seus relacionamentos nos Grupos Premium.', steps: [
    { title: 'Gente Conexões', subtitle: 'Sua rede na plataforma', description: 'Vitrine e ferramentas de relacionamento conforme seu plano. Conheça pessoas e mantenha as conexões em movimento.', badge: 'Conhecer os planos', buttonLink: '#planos', icon: 'network' },
    { title: 'Gente HUB', subtitle: 'Networking em encontro', description: 'Encontros para ampliar sua rede. No Gente Conexões, a confirmação depende de convite específico para cada edição.', badge: 'Conhecer o Gente HUB', buttonLink: 'https://gentenetworking.com.br/gentehub', icon: 'calendar' },
    { title: 'Grupos Premium', subtitle: 'Sua próxima etapa', description: 'Master, Conecte e Impulso: participação recorrente para aprofundar conexões. A adesão exige plano próprio e não está incluída nesta assinatura.', badge: 'Conhecer os Grupos', buttonLink: 'https://gentenetworking.com.br/participe', icon: 'crown' },
  ], ctaTitle: 'Aprofunde suas conexões nos Grupos Premium.', ctaSubtitle: 'Conheça as modalidades de participação recorrente. A contratação é independente do Gente Conexões.', ctaButton: 'Conhecer os Grupos Premium' },
  audience: { title: 'Para quem acredita no poder das conexões.', subtitle: 'Profissionais, empreendedores e prestadores de serviços que querem ser conhecidos, construir parcerias e ampliar sua rede.', audiences: [
    { title: 'Consultores', description: 'Troque experiências e encontre parceiros que abrem novas portas.' },
    { title: 'Advogados', description: 'Construa relações profissionais com diferentes setores.' },
    { title: 'Contadores', description: 'Aproxime sua experiência de quem precisa dela.' },
    { title: 'Corretores', description: 'Conheça profissionais e públicos complementares.' },
    { title: 'Empreendedores', description: 'Amplie sua rede para além do seu mercado habitual.' },
    { title: 'Prestadores de serviços', description: 'Mostre o que oferece e descubra possibilidades de colaboração.' },
  ] },
  testimonials: { title: 'Conexões que fazem a diferença.', subtitle: 'Experiências de quem participa do Gente.', testimonials: [], stats: [] },
  offer: { title: 'Sua próxima conexão começa aqui.', subtitle: 'Escolha entre as ofertas disponíveis. Recursos, franquias, vagas e condições são definidos em cada plano.', buttonText: 'Escolher este plano', reassurance: 'Pagamento na página segura do Asaas. A assinatura dos Grupos Premium é contratada separadamente.' },
  faq: { ...SUBSCRIBER_DEFAULTS.faq, faqs: [
    ...(SUBSCRIBER_DEFAULTS.faq?.faqs?.filter(item => item.question !== 'Como contratar?') ?? []),
    { question: 'Posso confirmar qualquer encontro?', answer: 'Você pode consultar os próximos encontros, mas a confirmação exige um convite específico para o evento, inclusive Gente HUB. A assinatura não confirma presença automaticamente.' },
    { question: 'Existe teste gratuito?', answer: 'Somente quando habilitado na oferta. A duração e as condições aparecem no plano. O teste é válido para a primeira contratação elegível e depende do seu consentimento.' },
    { question: 'Como contratar?', answer: 'Escolha uma oferta disponível, crie sua conta ou entre com uma conta existente e confirme a contratação. O pagamento é feito no Asaas; sem teste elegível, o acesso é liberado após a confirmação do pagamento.' },
  ], contacts: [] },
};

export function connectionsContent(saved: AdvancedContent): AdvancedContent {
  const result: AdvancedContent = {};
  for (const key of CONNECTION_SECTIONS) Object.assign(result, { [key]: { ...CONNECTION_DEFAULTS[key], ...saved[key] } });
  return result;
}