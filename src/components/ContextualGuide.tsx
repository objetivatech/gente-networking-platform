/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, ArrowRight, CircleHelp } from 'lucide-react';
import { canAutoStartGuide, getContextualGuide, needsProfilePrompt } from '@/lib/contextual-guide';
import type { AppRole } from '@/lib/access-control';
import { getProfileCompleteness } from '@/lib/profile-completeness';
import { ProfileCompletionDialog } from '@/components/profile/ProfileCompletionDialog';

export function ContextualGuide({ userId, role, pathname, blocked, profileComplete, menuOpen, onOpenChange, profile, profileReady = true }: { userId: string; role: AppRole; pathname: string; blocked: boolean; profileComplete: boolean; menuOpen: boolean; onOpenChange: (open: boolean) => void; profile?: Record<string, any> | null; profileReady?: boolean }) {
  const key = `gente-guide-v1:${userId}:${role}:${pathname}`;
  const profileKey = `gente-profile-prompt-v1:${userId}`;
  const missingKey = getProfileCompleteness(profile).missing.map(field => field.key).join(',');
  const [deferredKey, setDeferredKey] = useState(() => { try { return sessionStorage.getItem(profileKey) ?? ''; } catch { return ''; } });
  const profilePending = !!profile && needsProfilePrompt(profileReady, profileComplete, missingKey, deferredKey);
  const [profileOpen, setProfileOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [otherDialog, setOtherDialog] = useState(false);
  const steps = getContextualGuide(pathname, role);
  const change = (next: boolean) => { setOpen(next); onOpenChange(next); if (next) { setStep(0); try { localStorage.setItem(key, 'seen'); } catch { /* optional UX persistence */ } } };
  const dismissProfile = () => { setDeferredKey(missingKey); setProfileOpen(false); try { sessionStorage.setItem(profileKey, missingKey); } catch { /* session fallback in memory */ } };
  useEffect(() => { if (profileReady && profileComplete) { setDeferredKey(''); try { sessionStorage.removeItem(profileKey); } catch { /* optional UX persistence */ } } }, [profileReady, profileComplete, profileKey]);
  useEffect(() => {
    const update = () => setOtherDialog([...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some(element => !element.closest('[data-contextual-guide]') && element.getClientRects().length > 0));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'hidden', 'style'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setOpen(false); setStep(0); onOpenChange(false); }, [pathname, role]);
  useEffect(() => { if (blocked || otherDialog || menuOpen || profilePending) { setOpen(false); onOpenChange(false); } }, [blocked, otherDialog, menuOpen, profilePending]);
  useEffect(() => {
    if (!profilePending || blocked || otherDialog || menuOpen) { setProfileOpen(false); return; }
    const timer = window.setTimeout(() => setProfileOpen(true), 300);
    return () => window.clearTimeout(timer);
  }, [profilePending, blocked, otherDialog, menuOpen]);
  useEffect(() => { onOpenChange(open || profileOpen); }, [open, profileOpen, onOpenChange]);
  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(key) === 'seen'; } catch { /* manual guide stays available */ }
    if (!profileReady || profilePending || profileOpen || !canAutoStartGuide(blocked || menuOpen, profileComplete, otherDialog, seen, !!profile && missingKey === deferredKey)) return;
    const timer = window.setTimeout(() => change(true), 600);
    return () => window.clearTimeout(timer);
  }, [key, blocked, profileComplete, otherDialog, menuOpen, profileReady, profilePending, profileOpen, missingKey, deferredKey]);
  const current = steps[step];
  return <>
    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" className="gap-2 shrink-0" aria-label="Guia desta página" disabled={blocked || otherDialog || menuOpen || profilePending || !profileReady} onClick={() => change(true)}><CircleHelp className="h-4 w-4" />Guia</Button></TooltipTrigger><TooltipContent>{blocked ? 'Conclua o acolhimento para abrir o guia' : profilePending ? 'Complete o perfil ou escolha lembrar mais tarde' : 'Guia desta página'}</TooltipContent></Tooltip>
    {profile && <ProfileCompletionDialog profile={profile} open={profileOpen && !blocked && !otherDialog && !menuOpen} onDismiss={dismissProfile} />}
    <Dialog open={open && !blocked && !otherDialog && !menuOpen} onOpenChange={change}><DialogContent data-contextual-guide className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg"><DialogHeader><p className="text-xs font-semibold text-accent-foreground">Gente Networking · {step + 1} de {steps.length}</p><DialogTitle>{current?.title}</DialogTitle><DialogDescription className="pt-3 text-base leading-relaxed">{current?.text}</DialogDescription></DialogHeader><DialogFooter className="mt-4 flex-row justify-between gap-3"><Button variant="outline" aria-label="Etapa anterior" disabled={step === 0} onClick={() => setStep(value => value - 1)}><ArrowLeft className="mr-2 h-4 w-4" />Anterior</Button><Button onClick={() => step === steps.length - 1 ? change(false) : setStep(value => value + 1)}>{step === steps.length - 1 ? 'Concluir' : 'Próximo'}<ArrowRight className="ml-2 h-4 w-4" /></Button></DialogFooter></DialogContent></Dialog>
  </>;
}