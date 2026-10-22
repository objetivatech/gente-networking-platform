/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { useLandingPage } from '../hooks/useLandingPage';
import { useAdvancedPageContent } from '../hooks/useAdvancedPageContent';
import { AdvancedPlatformEntry } from './AdvancedPlatformEntry';
import type { AdvancedContent } from './landing/CommunityLandingPage';
import { PlatformLogin } from './PlatformLogin';
import { SEOHead } from './seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import logo from '@/assets/gente-networking-cor-cropped.png';
import { ArrowRight, LogIn } from 'lucide-react';
import { RDStationScript } from './landing/RDStationScript';
export function PlatformEntry() {
  const [loginOpen, setLoginOpen] = useState(false);
  const { data: page, error, isLoading } = useLandingPage('entrada-plataforma');
  const { data: advanced, error: contentError, isLoading: contentLoading } = useAdvancedPageContent(page?.id);
  return <div className="min-w-0 bg-background">
    <RDStationScript />
    <header className="border-b bg-background"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
      <a href="https://gentenetworking.com.br" className="flex h-14 w-36 items-center"><img src={logo} alt="Gente Networking" className="h-auto max-h-14 w-full object-contain" /></a>
      <nav className="flex items-center gap-3"><Button variant="ghost" className="hidden sm:inline-flex" asChild><a href="#ecossistema">Conheça o Gente</a></Button><Button onClick={() => setLoginOpen(true)}><LogIn className="mr-2 h-4 w-4" />Entrar</Button></nav>
    </div></header>
    {page && <SEOHead page={page} />}
    <main>
      {isLoading || contentLoading ? <div className="grid min-h-64 place-items-center" role="status">Carregando…</div> : error || contentError || !page ? <section className="mx-auto max-w-4xl px-5 py-20"><h1 className="text-4xl font-bold">Gente Networking</h1><p className="mt-5 text-lg text-muted-foreground">Conectando pessoas, gerando negócios.</p><Button onClick={() => setLoginOpen(true)} className="mt-8">Acessar a plataforma<ArrowRight className="ml-2 h-4 w-4" /></Button></section> : <AdvancedPlatformEntry content={(advanced?.content ?? {}) as AdvancedContent} onLogin={() => setLoginOpen(true)} />}
    </main>
    <footer className="border-t"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-sm text-muted-foreground"><span>© 2026 Gente Networking</span><a href="https://ranktop.com.br" target="_blank" rel="noreferrer">Criado e operado por Ranktop SEO Inteligente</a></div></footer>
    <Dialog open={loginOpen} onOpenChange={setLoginOpen}><DialogContent className="z-[70] w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg"><DialogHeader><DialogTitle>Acesse o Gente</DialogTitle><DialogDescription>Entre com sua conta da plataforma.</DialogDescription></DialogHeader><PlatformLogin /></DialogContent></Dialog>
  </div>;
}