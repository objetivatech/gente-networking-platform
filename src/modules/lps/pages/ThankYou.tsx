/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLandingPage } from '@/modules/lps/hooks/useLandingPage';
import { CheckCircle, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const source = searchParams.get('source') || '';
  const { data: page, isLoading } = useLandingPage(source);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (page?.whatsapp_group_link && page?.thank_you_redirect_delay) {
      setCountdown(page.thank_you_redirect_delay);
    }
  }, [page]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0 && page?.whatsapp_group_link) {
      window.location.href = page.whatsapp_group_link;
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, page?.whatsapp_group_link]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#3B82F6]">
        <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />
      </div>
    );
  }

  const primaryColor = page?.primary_color || 'hsl(var(--secondary))';
  const title = page?.thank_you_title || 'Obrigado!';
  const message = page?.thank_you_message || 'Sua inscrição foi realizada com sucesso.';

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: `linear-gradient(135deg, #1E3A5F 0%, ${primaryColor}40 100%)` }}
    >
      <div className="max-w-md w-full text-center">
        <div 
          className="bg-background/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-border/20"
        >
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: primaryColor }}
          >
            <CheckCircle className="h-10 w-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-3xl font-bold text-primary-foreground mb-4">
            {title}
          </h1>
          
          <p className="text-primary-foreground/80 text-lg mb-8">
            {message}
          </p>

          {page?.whatsapp_group_link && (
            <div className="space-y-4">
              <Button
                onClick={() => window.location.href = page.whatsapp_group_link ?? ''}
                className="w-full py-6 text-lg font-bold"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Entrar no Grupo do WhatsApp
              </Button>
              
              {countdown !== null && countdown > 0 && (
                <p className="text-primary-foreground/60 text-sm">
                  Redirecionando em {countdown} segundos...
                </p>
              )}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border/10">
            <Button
              onClick={() => navigate(`/${source}`)}
              className="text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors"
            >
              ← Voltar para a página
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
