import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { validateInvitation, Invitation } from '@/hooks/useInvitations';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import logoGente from '@/assets/logo-gente.png';

export default function ConvitePublico() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    async function checkInvite() {
      if (!code) {
        setLoading(false);
        return;
      }

      const inv = await validateInvitation(code);
      setInvitation(inv);
      setValid(!!inv);
      setLoading(false);
    }

    checkInvite();
  }, [code]);

  const handleAccept = () => {
    navigate(`/convite/${code}/cadastrar`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Card className="w-full max-w-md border-primary/20 shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logoGente} 
              alt="Gente Networking" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl text-primary">Gente Networking</CardTitle>
          <CardDescription className="text-secondary-foreground">Conectando pessoas, gerando negócios</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {valid && invitation ? (
            <>
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg text-green-700 dark:text-green-300">
                  Convite Válido!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {invitation.name ? `Olá ${invitation.name}, você` : 'Você'} foi convidado(a) para fazer parte da nossa comunidade de networking.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Crie sua conta para acessar a plataforma e começar a fazer conexões valiosas.
                </p>
              </div>

              <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" size="lg" onClick={handleAccept}>
                Aceitar Convite e Criar Conta
              </Button>

              <p className="text-xs text-muted-foreground">
                Código do convite: <code className="font-mono bg-muted px-1 py-0.5 rounded">{code}</code>
              </p>
            </>
          ) : (
            <>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg text-red-700 dark:text-red-300">
                  Convite Inválido
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Este convite não é válido, já foi utilizado ou expirou.
                </p>
              </div>

              <p className="text-muted-foreground text-sm">
                Entre em contato com quem te enviou o convite para obter um novo código.
              </p>

              <Button variant="outline" onClick={() => navigate('/auth')} className="border-primary text-primary hover:bg-primary/10">
                Ir para Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
