/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { AdvancedContent } from './landing/CommunityLandingPage';
import { entryContent } from '../lib/entry-content';
import { renderContent } from '../lib/markdown';
import networking from '../assets/reuniao-online.png';
import whiteLogo from '@/assets/gente-networking-cropped.png';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowRight } from 'lucide-react';
export function AdvancedPlatformEntry({ content, onLogin }: { content: AdvancedContent; onLogin: () => void }) {
  const c = entryContent(content);
  return <>
    <section className="relative isolate flex min-h-96 items-center justify-center overflow-hidden py-16 sm:py-20">
      <img src={c.hero?.imageUrl && c.hero.imageUrl !== '/lp-entry-networking.png' ? c.hero.imageUrl : networking} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-primary/70" />
      <div className="mx-auto max-w-4xl px-5 text-center text-primary-foreground">
        <img src={whiteLogo} alt="Gente Networking" className="mx-auto mb-6 h-16 w-auto max-w-full object-contain" />
        <h1 className="text-3xl font-bold sm:text-4xl break-words">{c.hero?.title}</h1><p className="mt-5 text-lg">{c.hero?.subtitle}</p>
        <Button variant="secondary" size="lg" className="mt-8" asChild><a href="#ecossistema">{c.hero?.buttonText || 'Conheça o Gente'}<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
      </div>
    </section>
    <section id="ecossistema" className="mx-auto max-w-6xl px-5 py-14">
      <h2 className="text-2xl font-bold sm:text-3xl">{c.ecosystem?.title}</h2><p className="mt-3 text-muted-foreground">{c.ecosystem?.subtitle}</p>
      <div className="mt-9 grid gap-8 md:grid-cols-3">{c.ecosystem?.steps?.map((step, i) => <article key={i} className="min-w-0 border-t pt-6"><h3 className="text-xl font-semibold text-secondary">{step.title}</h3><p className="mt-3 text-muted-foreground">{step.subtitle}</p><div className="mt-4 break-words" dangerouslySetInnerHTML={{ __html: renderContent(step.description) }} />{step.buttonLink && /^(https:\/\/|\/|#)/.test(step.buttonLink) && <Button asChild className="mt-6 whitespace-normal"><a href={step.buttonLink}>{step.badge || 'Conheça'}</a></Button>}</article>)}</div>
    </section>
    <section className="border-y bg-muted/30"><div className="mx-auto max-w-6xl px-5 py-14"><h2 className="text-2xl font-bold">{c.benefits?.title}</h2><p className="mt-3 text-muted-foreground">{c.benefits?.subtitle}</p><div className="mt-6 grid gap-6 sm:grid-cols-2">{c.benefits?.cards?.map((item,i) => <article key={i}><h3 className="font-semibold">{item.title}</h3><p className="mt-2">{item.description}</p></article>)}</div><Button onClick={onLogin} className="mt-6">Entrar na plataforma<ArrowRight className="ml-2 h-4 w-4" /></Button></div></section>
    <section className="mx-auto max-w-6xl px-5 py-14"><h2 className="text-2xl font-bold">{c.reasons?.title}</h2><div className="mt-7 grid gap-8 sm:grid-cols-2">{c.reasons?.reasons?.map((item,i) => <article key={i}><h3 className="text-lg font-semibold">{item.title}</h3><p className="mt-3 text-muted-foreground">{item.description}</p></article>)}</div></section>
    <section className="mx-auto max-w-6xl px-5 pb-14"><h2 className="text-2xl font-bold">{c.faq?.title}</h2><Accordion type="single" collapsible className="mt-6">{c.faq?.faqs?.map((faq,i) => <AccordionItem key={i} value={String(i)}><AccordionTrigger className="text-left">{faq.question}</AccordionTrigger><AccordionContent>{faq.answer}</AccordionContent></AccordionItem>)}</Accordion></section>
  </>;
}