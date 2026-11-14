/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, ArrowRight, CircleHelp } from 'lucide-react';
import { canAutoStartGuide, getContextualGuide } from '@/lib/contextual-guide';
import type { AppRole } from '@/lib/access-control';

export function ContextualGuide({ userId, role, pathname, blocked, profileComplete, menuOpen, onOpenChange }: { userId: string; role: AppRole; pathname: string; blocked: boolean; profileComplete: boolean; menuOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const key = `gente-guide-v1:${userId}:${role}:${pathname}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [otherDialog, setOtherDialog] = useState(false);
  const steps = getContextualGuide(pathname, role);
  const change = (next: boolean) => { setOpen(next); onOpenChange(next); if (next) { setStep(0); try { localStorage.setItem(key, 'seen'); } catch { /* optional UX persistence */ } } };
  useEffect(() => {
    const update = () => setOtherDialog([...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some(element => !element.closest('[data-contextual-guide]') && element.getClientRects().length > 0));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'hidden', 'style'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setOpen(false); setStep(0); onOpenChange(false); }, [pathname, role]);
  useEffect(() => { if (blocked || otherDialog || menuOpen) { setOpen(false); onOpenChange(false); } }, [blocked, otherDialog, menuOpen]);
  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(key) === 'seen'; } catch { /* manual guide stays available */ }
    if (!canAutoStartGuide(blocked || menuOpen, profileComplete, otherDialog, seen)) return;
    const timer = window.setTimeout(() => change(true), 600);
    return () => window.clearTimeout(timer);
  }, [key, blocked, profileComplete, otherDialog, menuOpen]);
  const current = steps[step];
  return <>
    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Guia desta página" disabled={blocked || otherDialog || menuOpen} onClick={() => change(true)}><CircleHelp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent>{blocked ? 'Conclua o acolhimento para abrir o guia' : 'Guia desta página'}</TooltipContent></Tooltip>
    <Dialog open={open && !blocked && !otherDialog && !menuOpen} onOpenChange={change}><DialogContent data-contextual-guide className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg"><DialogHeader><p className="text-xs font-semibold text-accent-foreground">Gente Networking · {step + 1} de {steps.length}</p><DialogTitle>{current?.title}</DialogTitle><DialogDescription className="pt-3 text-base leading-relaxed">{current?.text}</DialogDescription></DialogHeader><DialogFooter className="mt-4 flex-row justify-between gap-3"><Button variant="outline" aria-label="Etapa anterior" disabled={step === 0} onClick={() => setStep(value => value - 1)}><ArrowLeft className="mr-2 h-4 w-4" />Anterior</Button><Button onClick={() => step === steps.length - 1 ? change(false) : setStep(value => value + 1)}>{step === steps.length - 1 ? 'Concluir' : 'Próximo'}<ArrowRight className="ml-2 h-4 w-4" /></Button></DialogFooter></DialogContent></Dialog>
  </>;
}