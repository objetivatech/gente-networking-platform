/**
 * PWAInstallPrompt — banner de instalação do PWA (v3.27.0).
 * - Aparece sempre que não instalado (mobile Android/desktop via beforeinstallprompt, iOS via tutorial).
 * - "Agora não" oculta por 2 dias.
 * - Se o usuário instalar (evento appinstalled ou detecção standalone), nunca mais aparece.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'pwa-banner-dismissed';
const DISMISS_MS = 2 * 24 * 60 * 60 * 1000; // 2 dias

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isInstalled || isStandalone) {
      setShowBanner(false);
      return;
    }

    const wasDismissed = localStorage.getItem(DISMISS_KEY);
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      if (!Number.isNaN(dismissedAt) && Date.now() - dismissedAt < DISMISS_MS) {
        setShowBanner(false);
        return;
      }
      // Passou de 2 dias — limpa flag para permitir novo aparecimento.
      localStorage.removeItem(DISMISS_KEY);
    }

    const timer = setTimeout(() => {
      if ((isInstallable || isIOS) && !isInstalled && !isStandalone) {
        setShowBanner(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isIOS, isStandalone]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const handleInstall = async () => {
    if (isIOS) {
      window.location.href = '/instalar';
    } else {
      await promptInstall();
    }
  };

  if (isInstalled || isStandalone || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              Instale o Gente Comunidade
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Acesse rápido pela tela inicial, receba avisos e use offline.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInstall}
                className="flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Instalar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                Agora não
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Fechar"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
