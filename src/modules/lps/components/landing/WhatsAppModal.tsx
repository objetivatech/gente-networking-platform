/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, CheckCircle } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappLink: string;
  primaryColor?: string;
}

export function WhatsAppModal({ isOpen, onClose, whatsappLink, primaryColor = 'hsl(var(--secondary))' }: WhatsAppModalProps) {
  const handleWhatsAppClick = () => {
    window.open(whatsappLink, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" style={{ borderColor: primaryColor }}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
            <CheckCircle className="h-8 w-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            Inscrição Confirmada!
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            Sua inscrição foi realizada com sucesso. Agora entre no grupo do WhatsApp para receber todas as informações do evento.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <Button
            onClick={handleWhatsAppClick}
            className="w-full py-6 text-lg font-bold text-primary-foreground transition-transform hover:scale-105"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle className="mr-2 h-6 w-6" />
            Entrar no Grupo do WhatsApp
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
