/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { LandingPage } from '@/modules/lps/hooks/useLandingPage';
import { CommunityLeadForm } from '@/modules/lps/components/landing/CommunityLeadForm';
import { WhatsAppModal } from '@/modules/lps/components/landing/WhatsAppModal';
import { RDStationScript } from '@/modules/lps/components/landing/RDStationScript';
import { SEOHead } from '@/modules/lps/components/seo/SEOHead';
import { HText } from '@/modules/lps/components/landing/HighlightedText';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { handleSmoothScroll } from '@/modules/lps/lib/scroll';
import {
  ArrowRight, BadgeCheck, Brain, Briefcase, BriefcaseBusiness, Calculator, Calendar,
  Crown, Diamond, Handshake, HeartHandshake, Home, MapPin, MessageCircle, Network,
  Scale, ShieldCheck, Star, Target, TrendingUp, Users,
} from 'lucide-react';
import { useState } from 'react';
import heroAsset from '@/modules/lps/assets/gente-comunidade-hero.png.asset.json';
import problemImage from '@/modules/lps/assets/gente-comunidade-problem.jpg';
import benefitsImage from '@/modules/lps/assets/gente-comunidade-benefits.jpg';
import ecosystemImage from '@/modules/lps/assets/gente-comunidade-ecosystem.jpg';
import faqImage from '@/modules/lps/assets/gente-comunidade-faq.jpg';

// ---------- Types ----------
export interface IconCardItem { title: string; description: string; icon?: string }
export interface StatItem { value: string; label: string; icon?: string }
export interface AudienceItem { title: string; description: string }
export interface EcosystemStep {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeColor?: string;
  icon?: string;
}
export interface BenefitChip { text: string; icon?: string }
export interface TestimonialItem { name: string; role: string; city?: string; text: string }
export interface FaqItem { question: string; answer: string }
export interface ContactItem { label: string; value: string }

export interface AdvancedContent {
  hero?: { title?: string; subtitle?: string; buttonText?: string; imageUrl?: string; highlights?: string[] };
  authority?: { title?: string; subtitle?: string; stats?: StatItem[] };
  problem?: { title?: string; subtitle?: string; points?: string[]; imageUrl?: string; callout?: string; calloutSubtitle?: string };
  benefits?: { title?: string; subtitle?: string; cards?: IconCardItem[]; imageUrl?: string; highlight?: string; footer?: string };
  ecosystem?: {
    title?: string;
    subtitle?: string;
    steps?: EcosystemStep[];
    benefits?: BenefitChip[];
    ctaTitle?: string;
    ctaSubtitle?: string;
    ctaButton?: string;
  };
  audience?: { title?: string; subtitle?: string; audiences?: AudienceItem[] };
  testimonials?: { title?: string; subtitle?: string; testimonials?: TestimonialItem[]; stats?: StatItem[] };
  reasons?: { title?: string; subtitle?: string; reasons?: IconCardItem[] };
  form?: { title?: string; subtitle?: string; buttonText?: string; benefits?: IconCardItem[] };
  faq?: { title?: string; subtitle?: string; faqs?: FaqItem[]; contacts?: ContactItem[] };
}

interface Props {
  page: LandingPage;
  content: AdvancedContent;
}

// ---------- Defaults (briefing oficial — com markdown **destaque** em laranja) ----------
export const COMMUNITY_DEFAULTS: AdvancedContent = {
  hero: {
    title: 'As **melhores oportunidades** surgem através das indicações de pessoas que conhecem e **confiam no seu trabalho**.',
    subtitle: 'O **GeNtE Comunidade** reúne profissionais, empreendedores e prestadores de serviços que desejam ampliar sua rede de contatos, aumentar sua visibilidade e criar novas oportunidades através do networking.',
    buttonText: 'Entrar gratuitamente na comunidade',
    highlights: [
      'Participação gratuita',
      'Grupo aberto no WhatsApp',
      'Networking com alcance nacional',
      'Porta de entrada para o ecossistema GeNtE',
    ],
  },
  authority: {
    title: 'Mais de **7 anos** conectando profissionais, empreendedores e oportunidades em **todo o Brasil**.',
    subtitle: 'O **GeNtE Networking** reúne participantes de diferentes regiões do país, criando conexões que ampliam mercados, fortalecem relacionamentos e geram novas oportunidades.',
    stats: [
      { value: 'Mais de 7 anos', label: 'de atuação conectando pessoas e oportunidades desde 2017.', icon: 'calendar' },
      { value: 'Alcance nacional', label: 'Participantes de diversas regiões do Brasil, conectando mercados e experiências.', icon: 'map' },
      { value: 'Centenas de conexões', label: 'Relacionamentos que geram indicações, parcerias e novas oportunidades.', icon: 'users' },
      { value: 'Ecossistema estruturado', label: 'Uma jornada completa para transformar conexões em relacionamentos, parcerias e oportunidades.', icon: 'network' },
    ],
  },
  problem: {
    title: 'Ser excelente no que faz **não é suficiente**.',
    subtitle: 'Muitos profissionais dominam sua atividade, entregam resultados e atendem bem seus clientes. Mesmo assim, enfrentam dificuldades para gerar novas oportunidades porque **poucas pessoas conhecem seu trabalho**.',
    points: [
      'Sem visibilidade, não existem indicações.',
      'Sem indicações, o crescimento depende apenas da prospecção individual.',
      'Isso gera desgaste, perde tempo e limita o crescimento.',
    ],
    callout: 'Pessoas não indicam quem **não conhecem**.',
    calloutSubtitle: 'A visibilidade é o primeiro passo para gerar conexões, indicações e novas oportunidades.',
  },
  benefits: {
    title: 'Um ambiente para **ampliar sua visibilidade** e criar **conexões de valor**.',
    subtitle: 'O GeNtE Comunidade oferece diversas oportunidades para você se conectar, compartilhar e crescer junto com outros profissionais.',
    highlight: 'Mais visibilidade. Mais relacionamentos. **Mais oportunidades** para o seu negócio.',
    footer: 'Aqui, conexões se transformam em relacionamentos e relacionamentos geram **oportunidades**.',
    cards: [
      { title: 'Apresentação de negócios', description: 'Apresente seu trabalho, compartilhe o que faz e seja encontrado por profissionais que podem indicar seus serviços.', icon: 'megaphone' },
      { title: 'Networking', description: 'Conecte-se com profissionais de diversas áreas, troque contatos e construa relacionamentos de valor.', icon: 'users' },
      { title: 'Compartilhamento de experiências', description: 'Aprenda com histórias reais, troque insights e cresça com a jornada de outros profissionais.', icon: 'message' },
      { title: 'Eventos', description: 'Participe de encontros online e ações especiais que geram conexões e oportunidades qualificadas.', icon: 'calendar' },
      { title: 'Reuniões 1 a 1', description: 'Agende conversas individuais para aprofundar conexões e criar oportunidades reais de parceria.', icon: 'handshake' },
      { title: 'Aprendizado sobre networking', description: 'Tenha acesso a conteúdos práticos e dicas para aprimorar suas conexões e sua presença profissional.', icon: 'star' },
    ],
  },
  ecosystem: {
    title: 'Um ecossistema completo **para conectar, crescer e prosperar**.',
    subtitle: 'O GeNtE Comunidade é a porta de entrada para um ecossistema estruturado que acompanha você em cada etapa da sua jornada profissional, do **primeiro contato às grandes oportunidades**.',
    steps: [
      {
        title: 'GeNtE Comunidade',
        subtitle: 'Conecte-se e seja visto.',
        description: 'Participe gratuitamente da comunidade, amplie sua rede de contatos, compartilhe conhecimento e seja referenciado por profissionais de diversas áreas.',
        badge: 'Participação gratuita',
        badgeColor: '#1e3a8a',
        icon: 'users',
      },
      {
        title: 'GeNtE Hub',
        subtitle: 'Aprofunde e colabore.',
        description: 'Tenha acesso a conteúdos exclusivos, eventos, mentorias, grupos estratégicos e ferramentas que impulsionam seus relacionamentos e resultados.',
        badge: 'Assinatura Premium',
        badgeColor: '#7c3aed',
        icon: 'star',
      },
      {
        title: 'GeNtE Premium',
        subtitle: 'Conecte-se ao que há de melhor.',
        description: 'Tenha acesso à nossa curadoria de relacionamentos, networking estratégico e oportunidades de alto nível para acelerar sua evolução profissional.',
        badge: 'Experiência Exclusiva',
        badgeColor: '#c9a84c',
        icon: 'crown',
      },
    ],
    benefits: [
      { text: 'Comece na comunidade e evolua no ecossistema que acelera resultados.', icon: 'network' },
      { text: 'Mais relacionamentos qualificados e mais oportunidades.', icon: 'target' },
      { text: 'Cresça com conexões estratégicas em todo o Brasil.', icon: 'trending' },
      { text: 'Um caminho seguro para relacionamentos que geram negócios.', icon: 'shield' },
    ],
    ctaTitle: 'Dê o primeiro passo agora.',
    ctaSubtitle: 'Sua próxima grande oportunidade pode começar com uma **conexão**.',
    ctaButton: 'Entrar gratuitamente na comunidade',
  },
  audience: {
    title: 'A comunidade é para **você que quer crescer através de conexões**.',
    subtitle: 'Profissionais, empreendedores e prestadores de serviços de diversas áreas que acreditam no poder das relações para gerar oportunidades reais.',
    audiences: [
      { title: 'Advogados', description: 'Amplie sua rede, troque experiências e receba indicações qualificadas.' },
      { title: 'Consultores', description: 'Compartilhe conhecimento, faça parcerias e gere novos negócios.' },
      { title: 'Corretores', description: 'Conecte-se com outros profissionais e tenha mais oportunidades de vendas.' },
      { title: 'Psicólogos', description: 'Fortaleça sua presença profissional e seja indicado com confiança.' },
      { title: 'Contadores', description: 'Aumente sua visibilidade e conquiste novos clientes e parceiros.' },
      { title: 'E muito mais!', description: 'Empreendedores e prestadores de serviços de todas as áreas são bem-vindos.' },
    ],
  },
  testimonials: {
    title: 'Quem participa, **recomenda**. Histórias reais que geram novas conexões.',
    subtitle: 'Veja o que nossos participantes dizem sobre as conexões, oportunidades e relacionamentos que construíram aqui.',
    testimonials: [
      { name: 'Ricardo A.', role: 'Advogado', city: 'São Paulo – SP', text: 'Consegui novas parcerias e clientes através de conexões que fiz na comunidade. Hoje, meu negócio é resultado dessas relações.' },
      { name: 'Juliana M.', role: 'Consultora de Negócios', city: 'Curitiba – PR', text: 'A comunidade me trouxe visibilidade e me conectou com pessoas incríveis que indicam meu trabalho com confiança.' },
      { name: 'Marcos T.', role: 'Corretor de Imóveis', city: 'Belo Horizonte – MG', text: 'Participo dos eventos e grupos estratégicos e isso me ajuda a aprender, compartilhar e gerar oportunidades todos os dias.' },
      { name: 'Carla S.', role: 'Psicóloga', city: 'Salvador – BA', text: 'Mais do que contatos, eu encontrei uma rede de apoio profissional que realmente faz a diferença.' },
    ],
    stats: [
      { value: '+7 anos', label: 'conectando profissionais e oportunidades' },
      { value: 'De norte a sul', label: 'participantes de todas as regiões do Brasil' },
      { value: 'Centenas', label: 'de conexões e parcerias realizadas todos os dias' },
      { value: 'Um ecossistema', label: 'sólido e estruturado para relacionamentos que geram resultados' },
    ],
  },
  reasons: {
    title: 'Não é apenas uma comunidade. É um **movimento de conexões** que gera valor.',
    subtitle: 'No GeNtE Comunidade, acreditamos que relacionamentos verdadeiros abrem portas, geram oportunidades e transformam negócios.',
    reasons: [
      { title: 'Amplie sua rede', description: 'Conecte-se com profissionais de diversas áreas e regiões do Brasil.', icon: 'users' },
      { title: 'Gere oportunidades', description: 'Seja indicado, encontre parceiros e descubra novas oportunidades de negócios.', icon: 'handshake' },
      { title: 'Aprenda e cresça', description: 'Tenha acesso a conteúdos, eventos e experiências que impulsionam sua evolução profissional.', icon: 'star' },
      { title: 'Aumente sua visibilidade', description: 'Mostre seu trabalho, construa autoridade e seja lembrado quando surgirem oportunidades.', icon: 'trending' },
      { title: 'Fortaleça sua presença', description: 'Esteja em um ambiente colaborativo, ético e focado em crescimento contínuo.', icon: 'shield' },
      { title: 'Transforme conexões em resultados', description: 'Aqui, conexões se transformam em relacionamentos e relacionamentos geram resultados reais.', icon: 'arrow' },
    ],
  },
  form: {
    title: 'Comece hoje a **ampliar sua rede de contatos**.',
    subtitle: 'Entre gratuitamente para o GeNtE Comunidade e faça parte de um ambiente onde conexões podem se transformar em **relacionamentos, parcerias e oportunidades**.',
    buttonText: 'Entrar gratuitamente na comunidade',
    benefits: [
      { title: '100% gratuito', description: 'Participação gratuita, sem mensalidades e sem taxas.', icon: 'badge' },
      { title: 'Seguro e confiável', description: 'Ambiente verificado e moderado para garantir conexões de qualidade.', icon: 'shield' },
      { title: 'Comece agora', description: 'Leva menos de 2 minutos para entrar e fazer parte da nossa comunidade.', icon: 'arrow' },
    ],
  },
  faq: {
    title: 'Dúvidas frequentes. **Tudo o que você precisa saber**.',
    subtitle: 'Reunimos as principais dúvidas sobre a GeNtE Comunidade para que você entre com confiança e aproveite ao máximo.',
    faqs: [
      { question: 'A participação é gratuita?', answer: 'Sim. A participação na GeNtE Comunidade é 100% gratuita. Não cobramos mensalidades, taxas ou qualquer outro valor.' },
      { question: 'Preciso ser empresário?', answer: 'Não. A comunidade é aberta a profissionais, empreendedores e prestadores de serviços de diversas áreas.' },
      { question: 'Posso divulgar meu trabalho?', answer: 'Sim, dentro das diretrizes da comunidade. O foco é apresentar seu trabalho de forma colaborativa, gerando conexões e indicações.' },
      { question: 'Como participo?', answer: 'Basta preencher o formulário desta página. Você receberá o convite para entrar no grupo aberto no WhatsApp.' },
      { question: 'Preciso participar do HUB ou Premium?', answer: 'Não. A Comunidade é independente. O HUB e o Premium são camadas adicionais do ecossistema, para quem quiser aprofundar relacionamentos e oportunidades.' },
    ],
    contacts: [
      { label: 'E-mail', value: 'contato@gentecomunidade.com.br' },
      { label: 'WhatsApp', value: '(11) 99999-9999' },
      { label: 'Atendimento', value: 'Seg a Sex, das 9h às 18h' },
    ],
  },
};

// alias para compatibilidade
const D = COMMUNITY_DEFAULTS;

// ---------- Helpers ----------
const container = (cn = '') => `mx-auto w-full max-w-[1280px] px-4 md:px-6 ${cn}`.trim();

function iconFor(name?: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('calendar')) return Calendar;
  if (n.includes('users')) return Users;
  if (n.includes('message')) return MessageCircle;
  if (n.includes('handshake')) return Handshake;
  if (n.includes('star')) return Star;
  if (n.includes('badge')) return BadgeCheck;
  if (n.includes('shield')) return ShieldCheck;
  if (n.includes('trending')) return TrendingUp;
  if (n.includes('arrow')) return ArrowRight;
  if (n.includes('megaphone')) return BriefcaseBusiness;
  if (n.includes('map')) return MapPin;
  if (n.includes('network')) return Network;
  if (n.includes('target')) return Target;
  if (n.includes('crown')) return Crown;
  if (n.includes('diamond')) return Diamond;
  if (n.includes('heart')) return HeartHandshake;
  return Users;
}

function CtaButton({ label, primary, full }: { label: string; primary: string; full?: boolean }) {
  return (
    <a
      href="#form"
      onClick={(e) => handleSmoothScroll(e, '#form')}
      className={`inline-flex min-h-14 max-w-full items-center justify-center gap-3 rounded-[18px] px-4 py-4 text-center text-sm font-black uppercase leading-tight tracking-normal text-primary-foreground shadow-2xl transition-transform hover:scale-[1.01] sm:px-7 sm:text-base ${full ? 'w-full' : 'w-full sm:w-auto'}`}
      style={{ backgroundColor: primary }}
    >
      <ArrowRight className="h-5 w-5 shrink-0" />
      <span className="min-w-0 whitespace-normal break-words">{label}</span>
    </a>
  );
}

// ---------- Sections ----------
function Hero({ data, page, primary }: { data: AdvancedContent['hero']; page: LandingPage; primary: string }) {
  const c = { ...D.hero, ...(data || {}) };
  const highlights = c.highlights?.length ? c.highlights : D.hero!.highlights!;
  const imageUrl = c.imageUrl || heroAsset.url;

  return (
    <section className="relative overflow-hidden bg-[#051a3a] pb-10 pt-6 text-primary-foreground md:pt-10">
      <div className={container('grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]')}>
        <div className="space-y-6">
          {page.logo_url ? (
            <img src={page.logo_url} alt={`Logo ${page.name}`} className="h-20 md:h-24 w-auto object-contain" />
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary-foreground/70">GeNtE</p>
              <p className="text-4xl font-black uppercase leading-none md:text-5xl">Comunidade</p>
            </div>
          )}

          <div className="space-y-5">
            <HText
              as="h1"
              color={primary}
              className="max-w-[20ch] text-3xl font-black leading-[1.05] md:text-[2.6rem] md:leading-[1.08]"
            >
              {c.title}
            </HText>
            <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText
              as="p"
              color={primary}
              className="max-w-2xl text-base leading-7 text-primary-foreground/82 md:text-lg md:leading-8"
            >
              {c.subtitle}
            </HText>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/10 bg-background/5 px-4 py-3 backdrop-blur-sm">
                <div className="mt-1 rounded-full p-2" style={{ backgroundColor: `${primary}22` }}>
                  <BadgeCheck className="h-4 w-4" style={{ color: primary }} />
                </div>
                <span className="text-sm font-medium text-primary-foreground/90">{item}</span>
              </div>
            ))}
          </div>

          <a
            href="#form"
            onClick={(e) => handleSmoothScroll(e, '#form')}
            className="inline-flex w-full min-h-14 items-center justify-center gap-3 rounded-[18px] px-7 py-4 text-base font-black uppercase tracking-normal text-primary-foreground shadow-2xl transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: primary }}
          >
            <MessageCircle className="h-5 w-5" />
            {c.buttonText}
          </a>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[28px] border border-border/10 bg-[#06122b] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <img
              src={imageUrl}
              alt="Mosaico com profissionais conectados em videochamada na comunidade"
              width={1920}
              height={1080}
              className="aspect-[1.1/0.92] w-full rounded-[22px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Authority({ data, primary }: { data: AdvancedContent['authority']; primary: string }) {
  const c = { ...D.authority, ...(data || {}) };
  const stats = data?.stats?.length ? data.stats : D.authority!.stats!;

  return (
    <section className="bg-[#07214a] py-20 text-primary-foreground">
      <div className={container()}>
        <div className="grid gap-10 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="space-y-6">
            <HText as="h2" color={primary} className="max-w-[18ch] text-3xl font-black leading-[1.05] md:text-4xl">
              {c.title}
            </HText>
            <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText as="p" color={primary} className="max-w-2xl text-base leading-7 text-primary-foreground/82 md:text-lg">
              {c.subtitle}
            </HText>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map((s) => {
              const Icon = iconFor(s.icon);
              return (
                <div key={s.value + s.label} className="rounded-2xl border border-border/10 bg-background/5 p-6 text-center">
                  <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${primary}1f` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: primary }} />
                  </div>
                  <p className="text-xl font-black leading-tight" style={{ color: primary }}>
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-primary-foreground/82">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem({ data, primary }: { data: AdvancedContent['problem']; primary: string }) {
  const c = { ...D.problem, ...(data || {}) };
  const points = data?.points?.length ? data.points : D.problem!.points!;
  const imageUrl = data?.imageUrl || problemImage;

  return (
    <section className="bg-background py-20 text-foreground">
      <div className={container()}>
        <div className="overflow-hidden rounded-[30px] bg-[#06182f] text-primary-foreground shadow-2xl">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6 p-8 md:p-12">
              <HText as="h2" color={primary} className="max-w-[14ch] text-3xl font-black leading-[1.05] md:text-4xl">
                {c.title}
              </HText>
              <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
              <HText as="p" color={primary} className="max-w-xl text-base leading-7 text-primary-foreground/82 md:text-lg">
                {c.subtitle}
              </HText>
              <div className="space-y-4">
                {points.map((p) => (
                  <div key={p} className="flex items-start gap-4 border-b border-border/10 pb-4 last:border-b-0">
                    <div className="rounded-full p-3" style={{ backgroundColor: primary }}>
                      <TrendingUp className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <p className="max-w-lg text-base font-medium leading-7 text-primary-foreground/92 md:text-lg">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative min-h-[420px] bg-[#071e3a]">
              <img
                src={imageUrl}
                alt="Profissional refletindo diante do notebook"
                loading="lazy"
                className="absolute inset-x-0 bottom-0 w-full max-h-full object-contain object-bottom"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[30px] border border-orange-200 bg-background px-8 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <HText
            as="p"
            color={primary}
            className="text-center text-2xl font-black leading-tight text-[#08234a] md:text-4xl"
          >
            {c.callout}
          </HText>
          <p className="mt-4 text-center text-base text-muted-foreground md:text-lg">{c.calloutSubtitle}</p>
        </div>
      </div>
    </section>
  );
}

function Benefits({ data, primary }: { data: AdvancedContent['benefits']; primary: string }) {
  const c = { ...D.benefits, ...(data || {}) };
  const cards = data?.cards?.length ? data.cards : D.benefits!.cards!;
  const imageUrl = data?.imageUrl || benefitsImage;

  return (
    <section className="bg-[#f8fafc] py-20 text-foreground">
      <div className={container()}>
        <div className="grid items-stretch gap-0 overflow-hidden rounded-[30px] bg-background shadow-[0_25px_70px_rgba(15,23,42,0.08)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6 px-8 py-10 md:px-12 md:py-14">
            <HText as="h2" color={primary} className="max-w-[14ch] text-3xl font-black leading-[1.05] text-[#08234a] md:text-4xl">
              {c.title}
            </HText>
            <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText as="p" color={primary} className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              {c.subtitle}
            </HText>
            <HText as="p" color={primary} className="max-w-xl text-xl font-black leading-tight text-[#08234a] md:text-2xl">
              {c.highlight}
            </HText>
          </div>
          <div className="relative min-h-[380px]">
            <img src={imageUrl} alt="Profissionais em videochamada no networking online" loading="lazy" width={1920} height={1080} className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="mt-8 rounded-[30px] bg-[#08234a] p-5 md:p-7">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const Icon = iconFor(card.icon);
              return (
                <div key={card.title} className="rounded-[24px] bg-background p-6 text-center shadow-lg">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0c2d62]">
                    <Icon className="h-8 w-8" style={{ color: primary }} />
                  </div>
                  <h3 className="mt-5 text-lg font-black uppercase leading-tight text-[#08234a]">{card.title}</h3>
                  <div className="mx-auto mt-4 h-1 w-10 rounded-full" style={{ backgroundColor: primary }} />
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{card.description}</p>
                </div>
              );
            })}
          </div>
          <HText
            as="p"
            color={primary}
            className="mt-6 rounded-[22px] border border-border/30 px-6 py-5 text-center text-lg font-bold text-primary-foreground md:text-xl"
          >
            {c.footer}
          </HText>
        </div>
      </div>
    </section>
  );
}

function Ecosystem({ data, primary, page }: { data: AdvancedContent['ecosystem']; primary: string; page: LandingPage }) {
  const c = { ...D.ecosystem, ...(data || {}) };
  const steps = data?.steps?.length ? data.steps : D.ecosystem!.steps!;
  const benefits = data?.benefits?.length ? data.benefits : D.ecosystem!.benefits!;
  const ctaTitle = c.ctaTitle ?? D.ecosystem!.ctaTitle;
  const ctaSubtitle = c.ctaSubtitle ?? D.ecosystem!.ctaSubtitle;
  const ctaButton = c.ctaButton ?? D.ecosystem!.ctaButton;

  return (
    <section className="bg-[#051a3a] py-20 text-primary-foreground">
      <div className={container()}>
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <HText as="h2" color={primary} className="max-w-[18ch] text-3xl font-black leading-[1.05] md:text-4xl">
              {c.title}
            </HText>
            <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText as="p" color={primary} className="max-w-3xl text-base leading-7 text-primary-foreground/82 md:text-lg">
              {c.subtitle}
            </HText>
          </div>
          <div className="hidden items-center justify-center lg:flex">
            <div className="rounded-3xl bg-background/5 p-8 border border-border/10">
              {page.logo_url ? (
                <img
                  src={page.logo_url}
                  alt={`Logo ${page.name}`}
                  loading="lazy"
                  className="max-h-[260px] w-auto object-contain"
                />
              ) : (
                <img
                  src={ecosystemImage}
                  alt="Ecossistema GeNtE"
                  loading="lazy"
                  className="max-h-[260px] w-auto object-contain"
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = iconFor(step.icon);
            const badgeBg = step.badgeColor || primary;
            return (
              <div
                key={step.title}
                className="relative overflow-hidden rounded-[28px] border border-border/10 bg-[#0a2a58] p-7 shadow-2xl"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black text-primary-foreground"
                    style={{ backgroundColor: `${primary}33`, color: primary }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${badgeBg}22` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: badgeBg }} />
                  </div>
                </div>
                <h3 className="mt-5 text-2xl font-black leading-tight">{step.title}</h3>
                <p className="mt-2 text-base font-bold" style={{ color: primary }}>
                  {step.subtitle}
                </p>
                <p className="mt-4 text-sm leading-7 text-primary-foreground/78">{step.description}</p>
                <div
                  className="mt-6 inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-primary-foreground"
                  style={{ backgroundColor: badgeBg }}
                >
                  {step.badge}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 rounded-[26px] border border-border/10 bg-[#08234a] p-6 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((b) => {
            const Icon = iconFor(b.icon);
            return (
              <div key={b.text} className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${primary}22` }}
                >
                  <Icon className="h-5 w-5" style={{ color: primary }} />
                </div>
                <p className="text-sm font-semibold uppercase leading-6 text-primary-foreground/90">{b.text}</p>
              </div>
            );
          })}
        </div>

        <div
          className="mt-6 grid items-center gap-5 rounded-[26px] px-6 py-6 text-primary-foreground md:grid-cols-[1fr_auto] md:px-8"
          style={{ backgroundColor: primary }}
        >
          <div>
            <p className="text-2xl font-black leading-tight md:text-3xl">{ctaTitle}</p>
            <HText
              as="p"
              color="#0b1f3a"
              className="mt-2 text-base font-semibold text-primary-foreground/95 md:text-lg"
            >
              {ctaSubtitle}
            </HText>
          </div>
          <a
            href="#form"
            onClick={(e) => handleSmoothScroll(e, '#form')}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-[18px] bg-background px-6 py-4 text-sm font-black uppercase tracking-[0.1em] text-[#08234a] shadow-xl transition-transform hover:scale-[1.01]"
          >
            <ArrowRight className="h-5 w-5" />
            {ctaButton}
          </a>
        </div>
      </div>
    </section>
  );
}

function audienceIconFor(title: string) {
  const t = (title || '').toLowerCase();
  if (t.includes('advog')) return Scale;
  if (t.includes('consult')) return Briefcase;
  if (t.includes('corret')) return Home;
  if (t.includes('psic')) return Brain;
  if (t.includes('contad')) return Calculator;
  if (t.includes('muito mais') || t.includes('mais')) return Users;
  return Briefcase;
}

function Audience({ data, primary, page }: { data: AdvancedContent['audience']; primary: string; page: LandingPage }) {
  const c = { ...D.audience, ...(data || {}) };
  const items = data?.audiences?.length ? data.audiences : D.audience!.audiences!;

  return (
    <section className="bg-background py-20 text-foreground">
      <div className={container()}>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <HText as="h2" color={primary} className="max-w-[16ch] text-3xl font-black leading-[1.05] text-[#08234a] md:text-4xl">
              {c.title}
            </HText>
            <div className="mt-6 h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText as="p" color={primary} className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {c.subtitle}
            </HText>
          </div>
          <div className="flex flex-col items-end gap-4">
            {page.logo_url ? (
              <img src={page.logo_url} alt={`Logo ${page.name}`} className="h-20 md:h-28 w-auto object-contain" />
            ) : (
              <div className="text-right">
                <p className="text-3xl font-black leading-none text-[#08234a] md:text-4xl">GeNtE</p>
                <p className="mt-2 text-base uppercase tracking-[0.25em]" style={{ color: primary }}>Comunidade</p>
              </div>
            )}
            <p className="text-right text-lg font-light italic text-[#08234a]">Diversas áreas. Um mesmo propósito: <span style={{ color: primary }}>conectar e prosperar.</span></p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = audienceIconFor(item.title);
            return (
            <div key={item.title} className="rounded-[24px] border border-border bg-background p-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#0c2d62]">
                <Icon className="h-8 w-8 text-[#0c2d62]" />
              </div>
              <h3 className="mt-5 text-xl font-black uppercase leading-tight text-[#08234a]">{item.title}</h3>
              <div className="mx-auto mt-4 h-1 w-10 rounded-full" style={{ backgroundColor: primary }} />
              <p className="mt-4 text-base leading-7 text-muted-foreground">{item.description}</p>
            </div>
            );
          })}
        </div>

        <div className="mt-8 grid items-center gap-6 rounded-[28px] bg-[#08234a] px-6 py-6 text-primary-foreground md:grid-cols-[1fr_auto] md:px-10">
          <div>
            <p className="text-2xl font-black leading-none md:text-3xl">Você faz parte de algo maior.</p>
            <p className="mt-3 text-lg font-semibold" style={{ color: primary }}>Conecte-se, compartilhe e prospere junto.</p>
          </div>
          <CtaButton label="Entrar gratuitamente" primary={primary} />
        </div>
      </div>
    </section>
  );
}

function Testimonials({ data, primary }: { data: AdvancedContent['testimonials']; primary: string }) {
  const c = { ...D.testimonials, ...(data || {}) };
  const items = data?.testimonials?.length ? data.testimonials : D.testimonials!.testimonials!;
  const stats = data?.stats?.length ? data.stats : D.testimonials!.stats!;

  return (
    <section className="bg-[#051a3a] py-20 text-primary-foreground">
      <div className={container()}>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <HText as="h2" color={primary} className="max-w-[20ch] text-3xl font-black leading-[1.05] md:text-4xl">
              {c.title}
            </HText>
            <div className="mt-6 h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText as="p" color={primary} className="mt-6 max-w-3xl text-base leading-7 text-primary-foreground/82 md:text-lg">
              {c.subtitle}
            </HText>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <article key={item.name + item.role} className="rounded-[28px] bg-background p-7 text-foreground shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black" style={{ backgroundColor: `${primary}22`, color: primary }}>"</div>
              </div>
              <p className="mt-4 min-h-[160px] text-base leading-7 text-muted-foreground">{item.text}</p>
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-lg font-black text-[#08234a]">{item.name}</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: primary }}>{item.role}</p>
                {item.city ? <p className="mt-1 text-xs text-muted-foreground">{item.city}</p> : null}
                <div className="mt-3 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" style={{ color: primary }} />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 rounded-[26px] border border-border/10 bg-[#08234a] p-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.value + s.label} className="px-2">
              <p className="text-xl font-black leading-none" style={{ color: primary }}>{s.value}</p>
              <p className="mt-3 text-sm leading-7 text-primary-foreground/82">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reasons({ data, primary }: { data: AdvancedContent['reasons']; primary: string }) {
  const c = { ...D.reasons, ...(data || {}) };
  const items = data?.reasons?.length ? data.reasons : D.reasons!.reasons!;

  return (
    <section className="bg-background py-20 text-foreground">
      <div className={container()}>
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <HText as="h2" color={primary} className="max-w-[18ch] text-3xl font-black leading-[1.05] text-[#08234a] md:text-4xl">
              {c.title}
            </HText>
            <div className="mt-6 h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText as="p" color={primary} className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              {c.subtitle}
            </HText>
          </div>
          <div className="text-right text-sm font-semibold leading-relaxed text-[#08234a]">
            <HeartHandshake className="ml-auto h-12 w-12" style={{ color: primary }} />
            Relacionamentos verdadeiros.<br />Oportunidades reais.<br /><span style={{ color: primary }}>Juntos, vamos mais longe.</span>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => {
            const Icon = iconFor(r.icon);
            return (
              <div key={r.title} className="rounded-[24px] border border-border bg-background p-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.07)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#0c2d62]">
                  <Icon className="h-8 w-8 text-[#0c2d62]" />
                </div>
                <h3 className="mt-5 text-lg font-black uppercase leading-tight text-[#08234a]">{r.title}</h3>
                <div className="mx-auto mt-4 h-1 w-10 rounded-full" style={{ backgroundColor: primary }} />
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{r.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FormSection({ data, page, primary, onSuccess }: { data: AdvancedContent['form']; page: LandingPage; primary: string; onSuccess: () => void }) {
  const c = { ...D.form, ...(data || {}) };
  const benefits = data?.benefits?.length ? data.benefits : D.form!.benefits!;

  return (
    <section id="form" className="bg-background py-20 text-foreground">
      <div className={container()}>
        <div className="grid min-w-0 gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="min-w-0 space-y-6">
            <HText as="h2" color={primary} className="max-w-[14ch] text-3xl font-black leading-[1.05] text-[#08234a] md:text-4xl">
              {c.title}
            </HText>
            <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText as="p" color={primary} className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              {c.subtitle}
            </HText>

            <div className="space-y-5 pt-2">
              {benefits.map((item) => {
                const Icon = iconFor(item.icon);
                return (
                  <div key={item.title} className="flex min-w-0 gap-3 border-b border-border pb-5 last:border-b-0 sm:gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#08234a]">
                      <Icon className="h-6 w-6" style={{ color: primary }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-black uppercase leading-tight text-[#08234a]">{item.title}</p>
                      <p className="mt-2 break-words text-base leading-7 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full min-w-0 max-w-full rounded-[24px] bg-[#061c3d] p-4 text-primary-foreground shadow-[0_28px_90px_rgba(15,23,42,0.22)] sm:rounded-[30px] sm:p-6 md:p-8">
            <div className="mx-auto w-full max-w-2xl min-w-0">
              <h3 className="break-words text-center text-lg font-black leading-tight sm:text-2xl md:text-3xl">
                Faça parte da GeNtE Comunidade e <span style={{ color: primary }}>transforme conexões em oportunidades.</span>
              </h3>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 px-1 text-center text-sm leading-6 text-primary-foreground/70 md:text-base">
                <Users className="h-5 w-5 shrink-0" /> <span className="min-w-0">Junte-se a profissionais de todo o Brasil.</span>
              </div>
              <div className="mt-6 min-w-0 sm:mt-8">
                <CommunityLeadForm
                  landingPageId={page.id}
                  source={page.slug}
                  primaryColor={primary}
                  onSuccess={onSuccess}
                  buttonText={c.buttonText}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 rounded-[28px] bg-[#f8fafc] p-6 md:grid-cols-3">
          <div className="flex items-center gap-4 rounded-[20px] bg-background p-4 shadow-sm"><Users className="h-8 w-8 text-[#08234a]" /><p className="text-sm font-semibold text-muted-foreground">Centenas de profissionais já estão conectados e crescendo juntos.</p></div>
          <div className="flex items-center gap-4 rounded-[20px] bg-background p-4 shadow-sm"><MapPin className="h-8 w-8 text-[#08234a]" /><p className="text-sm font-semibold text-muted-foreground">De todas as regiões do Brasil, conectando talentos, experiências e oportunidades.</p></div>
          <div className="flex items-center gap-4 rounded-[20px] bg-background p-4 shadow-sm"><Star className="h-8 w-8 text-[#08234a]" /><p className="text-sm font-semibold text-muted-foreground">Comunidade bem avaliada por quem já participa.</p></div>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ data, primary }: { data: AdvancedContent['faq']; primary: string }) {
  const c = { ...D.faq, ...(data || {}) };
  const faqs = data?.faqs?.length ? data.faqs : D.faq!.faqs!;
  const contacts = data?.contacts?.length ? data.contacts : D.faq!.contacts!;

  return (
    <section className="bg-background py-20 text-foreground">
      <div className={container()}>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <HText as="h2" color={primary} className="max-w-[14ch] text-3xl font-black leading-[1.05] text-[#08234a] md:text-4xl">
              {c.title}
            </HText>
            <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <HText as="p" color={primary} className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              {c.subtitle}
            </HText>

            <div className="rounded-[28px] bg-[#f8fafc] p-5 shadow-sm sm:p-7">
              <p className="text-xl font-black text-[#08234a]">Ainda tem dúvidas?</p>
              <div className="mt-4 h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
              <div className="mt-6 space-y-5">
                {contacts.map((ct) => (
                  <div key={ct.label} className="border-b border-border pb-4 last:border-b-0">
                    <p className="text-base font-black text-[#08234a]">{ct.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground md:text-base">{ct.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Accordion type="single" collapsible className="min-w-0 space-y-4">
              {faqs.map((f, i) => (
                <AccordionItem key={f.question} value={`faq-${i}`} className="min-w-0 rounded-[22px] border border-border bg-background px-3 shadow-sm sm:px-6">
                  <AccordionTrigger className="min-w-0 gap-3 text-left text-base font-black leading-tight text-[#08234a] hover:no-underline md:text-lg">
                    <span className="min-w-0 whitespace-normal break-words">{f.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="break-words text-sm leading-7 text-muted-foreground md:text-base md:leading-8">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        <div className="mt-10 grid items-center gap-6 overflow-hidden rounded-[30px] bg-[#08234a] text-primary-foreground lg:grid-cols-[1fr_auto]">
          <div className="space-y-4 px-5 py-7 sm:px-8 sm:py-8 md:px-10">
            <p className="text-xl font-black leading-tight sm:text-2xl md:text-3xl">Pronto para transformar conexões em oportunidades reais?</p>
            <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <p className="max-w-xl text-sm leading-7 text-primary-foreground/80 sm:text-base md:text-lg">Entre gratuitamente na GeNtE Comunidade e faça parte de uma rede que cresce, apoia e indica.</p>
          </div>
          <div className="min-w-0 px-5 pb-7 sm:px-8 sm:pb-8 lg:px-10 lg:pb-0 lg:pt-8">
            <CtaButton label="Entrar gratuitamente" primary={primary} />
          </div>
        </div>


        <img src={faqImage} alt="" loading="lazy" width={1} height={1} className="sr-only" />
      </div>
    </section>
  );
}

// ---------- Main component ----------
export function CommunityLandingPage({ page, content }: Props) {
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const primary = page.primary_color || '#F87512';
  const c: AdvancedContent = content || {};

  const handleFormSuccess = () => {
    if (page.whatsapp_group_link) {
      setShowWhatsAppModal(true);
      return;
    }
    window.location.href = `/obrigado?source=${page.slug}`;
  };

  return (
    <>
      <RDStationScript />
      <SEOHead page={page} blocks={[]} />
      <main className="min-h-screen bg-background">
        <Hero data={c.hero} page={page} primary={primary} />
        <Authority data={c.authority} primary={primary} />
        <Problem data={c.problem} primary={primary} />
        <Benefits data={c.benefits} primary={primary} />
        <Ecosystem data={c.ecosystem} primary={primary} page={page} />
        <Audience data={c.audience} primary={primary} page={page} />
        <Testimonials data={c.testimonials} primary={primary} />
        <Reasons data={c.reasons} primary={primary} />
        <FormSection data={c.form} page={page} primary={primary} onSuccess={handleFormSuccess} />
        <FaqSection data={c.faq} primary={primary} />
      </main>
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        whatsappLink={page.whatsapp_group_link || ''}
        primaryColor={primary}
      />
    </>
  );
}
