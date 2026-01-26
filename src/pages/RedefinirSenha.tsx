/**
 * @page RedefinirSenha
 * @route /redefinir-senha
 * @description Página para redefinição de senha após clicar no link do email
 * 
 * @features
 * - Formulário de nova senha
 * - Confirmação de senha
 * - Indicador de força da senha
 * - Validação antes de enviar
 * 
 * @access Público (via token no URL)
 * @since 2024-12-08
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import logoGente from '@/assets/logo-gente.png';

export default function RedefinirSenha() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid session from the recovery link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session means invalid or expired link
        toast({
          title: 'Link inválido',
          description: 'O link de recuperação expirou ou é inválido. Solicite um novo.',
          variant: 'destructive',
        });
      }
    };
    
    checkSession();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    setLoading(true);
    
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });
    
    setLoading(false);
    
    if (updateError) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a senha. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    setSuccess(true);
    toast({
      title: 'Senha atualizada!',
      description: 'Sua senha foi redefinida com sucesso.',
    });
    
    // Redirect to home after 2 seconds
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-fade-in shadow-lg text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Senha Atualizada!</h2>
              <p className="text-muted-foreground">
                Sua senha foi redefinida com sucesso. Você será redirecionado...
              </p>
            </CardContent>
          </Card>
        </div>

        <footer className="border-t border-border bg-card py-4 px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm text-muted-foreground">
              © 2026. Criado e operado com{' '}
              <strong className="text-destructive">♥</strong> por{' '}
              <a href="https://ranktop.com.br" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:opacity-80 transition-opacity">
                <img src="https://ik.imagekit.io/oespecialisaseo/Logo%20RANKTOP%20cropped.png" width={100} alt="Ranktop" className="inline-block align-middle" />
              </a>.
            </span>
            <span className="text-xs text-muted-foreground max-w-2xl">
              Projeto construído com tecnologias de nuvem, banco de dados e inteligência artificial.
              <br />
              Recursos visuais licenciados por{' '}
              <a href="https://www.freepikcompany.com/legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Freepik</a>,{' '}
              <a href="https://www.freepikcompany.com/legal#nav-flaticon" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Flaticon</a>,{' '}
              <a href="https://fontawesome.com/license/free" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">FontAwesome</a>{' '}
              e <a href="https://lottiefiles.com/page/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">LottieFiles</a>.
            </span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto">
              <img 
                src={logoGente} 
                alt="Gente Networking" 
                className="w-36 h-auto mx-auto"
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
                <KeyRound className="h-6 w-6" />
                Redefinir Senha
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Digite sua nova senha abaixo
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordStrengthIndicator password={password} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="border-t border-border bg-card py-4 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm text-muted-foreground">
            © 2026. Criado e operado com{' '}
            <strong className="text-destructive">♥</strong> por{' '}
            <a href="https://ranktop.com.br" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:opacity-80 transition-opacity">
              <img src="https://ik.imagekit.io/oespecialisaseo/Logo%20RANKTOP%20cropped.png" width={100} alt="Ranktop" className="inline-block align-middle" />
            </a>.
          </span>
          <span className="text-xs text-muted-foreground max-w-2xl">
            Projeto construído com tecnologias de nuvem, banco de dados e inteligência artificial.
            <br />
            Recursos visuais licenciados por{' '}
            <a href="https://www.freepikcompany.com/legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Freepik</a>,{' '}
            <a href="https://www.freepikcompany.com/legal#nav-flaticon" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Flaticon</a>,{' '}
            <a href="https://fontawesome.com/license/free" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">FontAwesome</a>{' '}
            e <a href="https://lottiefiles.com/page/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">LottieFiles</a>.
          </span>
        </div>
      </footer>
    </div>
  );
}
