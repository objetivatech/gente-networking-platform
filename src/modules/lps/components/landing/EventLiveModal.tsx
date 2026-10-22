/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EventLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUrl?: string;
  redirectDelay?: number;
  primaryColor?: string;
}

export function EventLiveModal({ 
  isOpen, 
  onClose, 
  redirectUrl, 
  redirectDelay = 5,
  primaryColor = 'hsl(var(--secondary))' 
}: EventLiveModalProps) {
  const [countdown, setCountdown] = useState(redirectDelay);

  useEffect(() => {
    if (!isOpen || !redirectUrl) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = redirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, redirectUrl]);

  useEffect(() => {
    if (isOpen) {
      setCountdown(redirectDelay);
    }
  }, [isOpen, redirectDelay]);

  const handleGoNow = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center" style={{ borderColor: primaryColor }}>
        <DialogHeader className="text-center">
          <div 
            className="mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
            style={{ backgroundColor: primaryColor }}
          >
            <Video className="h-10 w-10 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            🎉 O Evento Está Acontecendo!
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            O evento que você estava aguardando está ao vivo agora. 
            Não perca essa oportunidade única de networking!
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {redirectUrl && (
            <p className="text-sm text-muted-foreground">
              Redirecionando em <span className="font-bold" style={{ color: primaryColor }}>{countdown}</span> segundos...
            </p>
          )}

          <Button
            onClick={handleGoNow}
            className="w-full py-6 text-lg font-bold text-primary-foreground transition-transform hover:scale-105"
            style={{ backgroundColor: primaryColor }}
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Ir para o Evento Agora
          </Button>

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
