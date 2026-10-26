/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { AdvancedContent } from './landing/CommunityLandingPage';
import { entryContent, SUBSCRIBER_DEFAULTS } from '../lib/entry-content';
import { renderContent } from '../lib/markdown';
import networking from '../assets/platform-networking.jpg';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowRight, ArrowUpRight, Users, Handshake, Network, Crown, Calendar, TrendingUp, User, Check } from 'lucide-react';

const icons = { users: Users, handshake: Handshake, network: Network, crown: Crown, calendar: Calendar, trending: TrendingUp, user: User };
function ContentIcon({ name }: { name?: string }) {
  const Icon = icons[name as keyof typeof icons] || Network;
  return <Icon className="h-6 w-6" strokeWidth={1.6} />;
}
function Copy({ text, className = '' }: { text?: string; className?: string }) {
  return <div className={`text-wrap-anywhere ${className}`} dangerouslySetInnerHTML={{ __html: renderContent(text) }} />;
}
export function AdvancedPlatformEntry({ content, onLogin, subscriber = false }: { content: AdvancedContent; onLogin: () => void; subscriber?: boolean }) {
  const c = entryContent(content, subscriber ? SUBSCRIBER_DEFAULTS : undefined);
  return <>
    <section className="entry-hero relative isolate flex items-center overflow-hidden">
      <img src={c.hero?.imageUrl && c.hero.imageUrl !== '/lp-entry-networking.png' ? c.hero.imageUrl : networking} alt="Profissionais trocando ideias em um encontro de networking" width={1600} height={912} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" fetchPriority="high" />
      <div className="entry-hero-shade absolute inset-0 -z-10" />
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20 text-primary-foreground">
        <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-normal"><span className="h-px w-9 bg-secondary" />{subscriber ? 'Gente Networking · Comunidade' : 'Conexões · Relacionamentos · Negócios'}</p>
        <h1 className="max-w-xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl text-wrap-anywhere">{c.hero?.title}</h1>
        <Copy text={c.hero?.subtitle} className="mt-6 max-w-lg text-lg leading-relaxed text-primary-foreground/90" />
        <div className="mt-8 flex max-w-xl flex-wrap gap-3">
          <Button variant="secondary" size="lg" className="h-auto min-h-12 whitespace-normal rounded-md py-3 text-foreground" asChild><a href={subscriber ? '#beneficios' : '/assinantes'}>{subscriber ? c.hero?.buttonText || 'Conhecer os benefícios' : 'Conhecer a assinatura'}<ArrowUpRight className="ml-2 h-4 w-4 shrink-0" /></a></Button>
          <Button size="lg" variant="outline" className="h-auto min-h-12 rounded-md border-primary-foreground/50 bg-transparent py-3 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={onLogin}>Já tenho conta<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
        <div className="mt-9 flex max-w-xl flex-wrap gap-x-6 gap-y-3 text-sm text-primary-foreground/90">{c.hero?.highlights?.map(item => <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-secondary" />{item}</span>)}</div>
      </div>
    </section>
    <section className="border-b bg-background"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1.1fr_2fr]">
      <div><Copy text={c.authority?.title} className="text-lg font-semibold" /><Copy text={c.authority?.subtitle} className="mt-2 text-sm text-muted-foreground" /></div>
      <div className="grid gap-6 sm:grid-cols-3">{c.authority?.stats?.map((stat,i) => <div key={i} className="border-l-2 border-secondary pl-4"><p className="text-lg font-semibold">{stat.value}</p><p className="mt-1 text-sm text-muted-foreground">{stat.label}</p></div>)}</div>
    </div></section>
    <section id="ecossistema" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-14 sm:px-8 sm:py-20">
      <p className="mb-3 text-xs font-semibold uppercase text-accent-foreground">O ecossistema Gente</p><Copy text={c.ecosystem?.title} className="max-w-3xl text-3xl font-bold sm:text-4xl" /><Copy text={c.ecosystem?.subtitle} className="mt-4 max-w-2xl leading-relaxed text-muted-foreground" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{c.ecosystem?.steps?.map((step,i) => <article key={i} className="flex min-w-0 flex-col border-t-2 border-primary/20 pt-6"><div className="flex items-center justify-between text-primary"><ContentIcon name={step.icon} /><span className="text-sm tabular-nums text-muted-foreground">0{i+1}</span></div><h3 className="mt-6 text-xl font-semibold">{step.title}</h3><Copy text={step.subtitle} className="mt-2 text-sm font-medium text-accent-foreground" /><Copy text={step.description} className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground" />{step.buttonLink && /^(https:\/\/|\/(?!\/)|#)/.test(step.buttonLink) && <Button variant="link" asChild className="mt-5 h-auto justify-start whitespace-normal px-0 py-2 text-left"><a href={step.buttonLink}>{step.badge || 'Conhecer'}<ArrowUpRight className="ml-2 h-4 w-4 shrink-0" /></a></Button>}</article>)}</div>
    </section>
    <section id="beneficios" className="scroll-mt-6 border-y bg-muted/40"><div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20"><p className="mb-3 text-xs font-semibold uppercase text-accent-foreground">{subscriber ? 'Sua assinatura' : 'A plataforma'}</p><Copy text={c.benefits?.title} className="max-w-3xl text-3xl font-bold sm:text-4xl" /><Copy text={c.benefits?.subtitle} className="mt-4 max-w-2xl leading-relaxed text-muted-foreground" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2">{c.benefits?.cards?.map((item,i) => <article key={i} className="flex min-w-0 gap-5 rounded-lg border bg-card p-6"><div className="shrink-0 text-primary"><ContentIcon name={item.icon} /></div><div className="min-w-0"><h3 className="text-lg font-semibold">{item.title}</h3><Copy text={item.description} className="mt-2 text-sm leading-relaxed text-muted-foreground" /></div></article>)}</div>
    </div></section>
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20"><div className="grid gap-10 md:grid-cols-2"><div><Copy text={c.reasons?.title} className="text-3xl font-bold sm:text-4xl" /><Copy text={c.reasons?.subtitle} className="mt-4 text-muted-foreground" /></div><div className="space-y-7">{c.reasons?.reasons?.map((item,i) => <article key={i} className="border-l-2 border-secondary pl-5"><h3 className="text-lg font-semibold">{item.title}</h3><Copy text={item.description} className="mt-2 leading-relaxed text-muted-foreground" /></article>)}</div></div></section>
    <section className="bg-primary text-primary-foreground"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center"><div><p className="mb-3 text-sm text-primary-foreground/75">{subscriber ? 'Sua próxima etapa' : 'Faça parte'}</p><h2 className="text-3xl font-bold">{subscriber ? 'Aprofunde suas conexões nos Grupos Premium.' : 'Sua próxima conexão começa aqui.'}</h2><p className="mt-4 max-w-xl text-primary-foreground/85">{subscriber ? 'Master, Conecte e Impulso: conheça as possibilidades de participação. A adesão a um Grupo exige um plano próprio.' : 'Conheça a assinatura da Comunidade e encontre novas possibilidades para sua rede.'}</p></div><Button size="lg" variant="secondary" className="h-auto min-h-12 shrink-0 whitespace-normal rounded-md py-3 text-foreground" asChild><a href={subscriber ? 'https://lps.gentenetworking.com.br/participe' : '/assinantes'}>{subscriber ? 'Conhecer os Grupos Premium' : 'Conhecer a assinatura'}<ArrowUpRight className="ml-2 h-4 w-4 shrink-0" /></a></Button></div></section>
    <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20"><Copy text={c.faq?.title} className="text-3xl font-bold" /><Accordion type="single" collapsible className="mt-8">{c.faq?.faqs?.map((faq,i) => <AccordionItem key={i} value={String(i)}><AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger><AccordionContent><Copy text={faq.answer} className="leading-relaxed text-muted-foreground" /></AccordionContent></AccordionItem>)}</Accordion>{subscriber && <Button size="lg" className="mt-8 h-auto whitespace-normal rounded-md py-3" asChild><a href={c.ecosystem?.steps?.find(step => step.icon === 'network')?.buttonLink || 'https://wa.me/555121652325'}>Consultar planos de assinatura<ArrowUpRight className="ml-2 h-4 w-4 shrink-0" /></a></Button>}</section>
  </>;
}
