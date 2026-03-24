import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import logoGente from '@/assets/logo-gente.png';

type ConfirmState = 'processing' | 'accepting_invite' | 'success' | 'error' | 'expired';

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ConfirmState>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    handleConfirmation();
  }, []);

  async function handleConfirmation() {
    try {
      // Supabase redirects with hash params: #access_token=...&type=signup
      // Or with query params for PKCE: ?code=...
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type') || searchParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const code = searchParams.get('code');

      // PKCE flow: exchange code for session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Code exchange failed:', error);
          setState('expired');
          setErrorMessage('O link de confirmação expirou ou já foi utilizado.');
          return;
        }
      }
      // Implicit flow: set session from tokens in hash
      else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('Set session failed:', error);
          setState('expired');
          setErrorMessage('O link de confirmação expirou ou já foi utilizado.');
          return;
        }
      }

      // Wait for session to be available
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // No session after processing — possibly expired link
        setState('expired');
        setErrorMessage('Não foi possível confirmar seu email. O link pode ter expirado.');
        return;
      }

      // Check if there's an invitation code to accept
      const inviteCode = searchParams.get('invite') || localStorage.getItem('invitation_code');

      if (inviteCode) {
        setState('accepting_invite');
        try {
          const { data: result } = await supabase.rpc('accept_invitation', {
            _code: inviteCode,
            _user_id: session.user.id,
          });

          const resultObj = result as { success: boolean; error?: string } | null;
          if (resultObj && !resultObj.success) {
            console.warn('accept_invitation returned error:', resultObj.error);
            // Non-blocking: invite may have already been accepted
          }

          localStorage.removeItem('invitation_code');
        } catch (err) {
          console.error('Failed to accept invitation:', err);
          // Non-blocking: continue to success
        }
      }

      setState('success');

      // Redirect after a brief pause
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Confirmation error:', err);
      setState('error');
      setErrorMessage('Ocorreu um erro ao processar a confirmação.');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoGente} alt="Gente Networking" className="h-20 w-auto" />
            </div>
            <CardTitle className="text-2xl text-primary">Gente Networking</CardTitle>
            <CardDescription>Conectando pessoas, gerando negócios</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {(state === 'processing' || state === 'accepting_invite') && (
              <div className="py-8 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">
                  {state === 'accepting_invite'
                    ? 'Aceitando seu convite...'
                    : 'Confirmando seu email...'}
                </p>
              </div>
            )}

            {state === 'success' && (
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-green-700 dark:text-green-300">
                    Email Confirmado!
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Sua conta foi ativada com sucesso. Redirecionando...
                  </p>
                </div>
              </div>
            )}

            {state === 'expired' && (
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-amber-700 dark:text-amber-300">
                    Link Expirado
                  </h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    {errorMessage}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tente fazer login normalmente. Se o problema persistir, solicite um novo convite.
                  </p>
                  <Button onClick={() => navigate('/auth', { replace: true })} className="w-full">
                    Ir para Login
                  </Button>
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-destructive">
                    Erro na Confirmação
                  </h3>
                  <p className="text-sm text-destructive/80 mt-1">
                    {errorMessage}
                  </p>
                </div>
                <Button onClick={() => navigate('/auth', { replace: true })} variant="outline" className="w-full">
                  Ir para Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
