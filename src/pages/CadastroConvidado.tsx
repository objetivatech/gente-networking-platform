import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

interface Invitation {
  id: string;
  code: string;
  invited_by: string;
  email: string | null;
  name: string | null;
  status: 'pending' | 'accepted' | 'expired';
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');
const phoneSchema = z.string().min(10, 'WhatsApp inválido').max(11, 'WhatsApp inválido');

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  phone?: string;
  company?: string;
  businessSegment?: string;
}

const formatPhoneBR = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export default function CadastroConvidado() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [businessSegment, setBusinessSegment] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    async function checkInvite() {
      console.log('Checking invitation with code:', code);

      if (!code) {
        console.log('No code provided');
        setValidating(false);
        setValid(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('invitations')
          .select('*')
          .eq('code', code.toUpperCase())
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        console.log('Invitation query result:', { data, error });

        if (error) {
          console.error('Error checking invitation:', error);
          setValid(false);
          setInvitation(null);
        } else if (data) {
          console.log('Valid invitation found:', data);
          setInvitation(data as Invitation);
          setValid(true);
          if (data.name) setFullName(data.name);
          if (data.email) setEmail(data.email);
          localStorage.setItem('invitation_code', code);
        } else {
          console.log('No invitation found for code:', code);
          setValid(false);
          setInvitation(null);
        }
      } catch (err) {
        console.error('Error validating invitation:', err);
        setValid(false);
        setInvitation(null);
      }

      setValidating(false);
    }

    checkInvite();
  }, [code]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value);
    setPhone(formatted);
  };

  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToCheck.toLowerCase().trim())
        .maybeSingle();
      return !!data;
    } catch {
      return false;
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    try {
      emailSchema.parse(email);
    } catch {
      newErrors.email = 'Email inválido';
    }

    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!fullName.trim()) {
      newErrors.fullName = 'Nome Completo é obrigatório';
    }

    const phoneDigits = phone.replace(/\D/g, '');
    try {
      phoneSchema.parse(phoneDigits);
    } catch {
      newErrors.phone = 'WhatsApp inválido (ex: 11999999999)';
    }

    if (!company.trim()) {
      newErrors.company = 'Nome da Empresa é obrigatório';
    }

    if (!businessSegment.trim()) {
      newErrors.businessSegment = 'Segmento de Negócio é obrigatório';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    if (!newErrors.email) {
      setCheckingEmail(true);
      const exists = await checkEmailExists(email);
      setCheckingEmail(false);
      if (exists) {
        newErrors.email = 'Este email já está cadastrado. Tente fazer login.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (!isValid) return;

    setLoading(true);
    const { error, data } = await signUp(email, password, fullName, phone, company, businessSegment);

    if (error) {
      setLoading(false);
      let message = 'Erro ao cadastrar';
      if (error.message.includes('User already registered')) {
        message = 'Este email já está cadastrado';
      }
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (code && data?.user?.id) {
      try {
        await supabase.rpc('accept_invitation', {
          _code: code,
          _user_id: data.user.id
        });
        localStorage.removeItem('invitation_code');
      } catch (err) {
        console.error('Failed to accept invitation:', err);
      }
    }

    toast({
      title: 'Bem-vindo ao Gente Networking!',
      description: 'Sua conta foi criada com sucesso. Redirecionando...',
    });

    const loginResult = await signIn(email, password);

    if (loginResult.error) {
      console.error('Auto-login failed:', loginResult.error);
      setLoading(false);
      toast({
        title: 'Cadastro realizado',
        description: 'Por favor, faça login para continuar',
      });
      navigate('/auth');
      return;
    }

    setLoading(false);
  };

  if (validating) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!valid || !invitation) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-destructive/20 shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-2xl font-bold">GN</span>
                </div>
              </div>
              <CardTitle className="text-2xl text-primary">Gente Networking</CardTitle>
              <CardDescription>Conectando pessoas, gerando negócios</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <h3 className="font-semibold text-lg text-destructive">
                  Convite Inválido
                </h3>
                <p className="text-sm text-destructive/80 mt-1">
                  Este convite não é válido, já foi utilizado ou expirou.
                </p>
              </div>

              <p className="text-muted-foreground text-sm">
                Entre em contato com quem te enviou o convite para obter um novo código.
              </p>

              <Button variant="outline" onClick={() => navigate('/auth')} className="border-primary text-primary hover:bg-primary/10">
                Ir para Login
              </Button>
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
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto">
              <div className="h-20 w-20 bg-primary rounded-full flex items-center justify-center mx-auto">
                <span className="text-primary-foreground text-2xl font-bold">GN</span>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Bem-vindo ao Gente Networking!</CardTitle>
              <CardDescription>
                Conectando pessoas, gerando negócios
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-6">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-center text-green-700 dark:text-green-400 mb-1">
                Você foi convidado!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-300 text-center">
                {invitation.name ? `${invitation.name}, complete` : 'Complete'} seu cadastro abaixo para fazer parte da nossa comunidade.
              </p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nome Completo *</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email *</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone">WhatsApp *</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-company">Nome da Empresa *</Label>
                <Input
                  id="signup-company"
                  type="text"
                  placeholder="Nome da sua empresa"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
                {errors.company && <p className="text-sm text-destructive">{errors.company}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-segment">Segmento de Negócio *</Label>
                <Input
                  id="signup-segment"
                  type="text"
                  placeholder="Ex: Tecnologia, Advocacia, Marketing..."
                  value={businessSegment}
                  onChange={(e) => setBusinessSegment(e.target.value)}
                  required
                />
                {errors.businessSegment && <p className="text-sm text-destructive">{errors.businessSegment}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Senha *</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordStrengthIndicator password={password} />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirmar Senha *</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading || checkingEmail}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando sua conta...
                  </>
                ) : (
                  'Criar Minha Conta'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Já tem uma conta?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-primary hover:underline"
                  onClick={() => navigate('/auth')}
                  type="button"
                >
                  Fazer login
                </Button>
              </p>
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
