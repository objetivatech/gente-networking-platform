/**
 * LgpdBanner - Preferências persistentes de cookies conforme LGPD (v3.33.0).
 * Persiste a escolha e mantém um acesso flutuante para consulta ou revogação.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie, ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'gente:lgpd-consent:v1';

interface Consent {
  status: 'accepted_all' | 'essential_only' | 'custom';
  ts: string;
  categories?: { essential: true; analytics: boolean; marketing: boolean };
}

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

export function LgpdBanner() {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    if (!stored) {
      // Pequeno delay para não competir com o loader inicial
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const acceptAll = () => {
    const next: Consent = {
      status: 'accepted_all',
      ts: new Date().toISOString(),
      categories: { essential: true, analytics: true, marketing: true },
    };
    writeConsent(next);
    setConsent(next);
    setVisible(false);
  };

  const essentialOnly = () => {
    const next: Consent = {
      status: 'essential_only',
      ts: new Date().toISOString(),
      categories: { essential: true, analytics: false, marketing: false },
    };
    writeConsent(next);
    setConsent(next);
    setVisible(false);
  };

  if (!visible) {
    return consent ? (
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => setVisible(true)}
        aria-label="Abrir preferências de cookies"
        title="Preferências de cookies"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[60] h-11 w-11 rounded-full bg-card shadow-lg md:bottom-5"
      >
        <Cookie className="h-5 w-5" aria-hidden="true" />
      </Button>
    ) : null;
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies LGPD"
      className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border bg-card text-card-foreground shadow-xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Cookie className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm sm:text-base font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Sua privacidade é importante
              </h2>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={essentialOnly}
                aria-label="Fechar aceitando apenas cookies essenciais"
                className="h-8 w-8 -mt-1 -mr-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Usamos cookies essenciais para o funcionamento da plataforma e, com sua autorização,
              cookies analíticos para melhorar sua experiência. Nenhum dado sensível é compartilhado
              com terceiros sem base legal (LGPD - Lei 13.709/2018).{' '}
              <Link to="/politica-de-cookies" className="underline text-primary hover:opacity-80">
                Saiba mais
              </Link>
              .
            </p>
            {consent && (
              <p className="text-xs text-muted-foreground">
                Preferência atual: {consent.status === 'accepted_all' ? 'todos os cookies' : 'somente essenciais'} · atualizada em{' '}
                {new Date(consent.ts).toLocaleDateString('pt-BR')}.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={acceptAll}>
                Aceitar todos
              </Button>
              <Button size="sm" variant="outline" onClick={essentialOnly}>
                Somente essenciais
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/politica-de-privacidade">Ler políticas</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LgpdBanner;
