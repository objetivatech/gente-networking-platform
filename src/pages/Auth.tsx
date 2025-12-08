import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import logoGente from '@/assets/logo-gente.png';

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

// Função para formatar telefone brasileiro
const formatPhoneBR = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export default function Auth() {
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
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value);
    setPhone(formatted);
  };

  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
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

  const validateForm = async (isSignUp: boolean): Promise<boolean> => {
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
    
    if (isSignUp) {
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

      // Check if email already exists
      if (!newErrors.email) {
        setCheckingEmail(true);
        const exists = await checkEmailExists(email);
        setCheckingEmail(false);
        if (exists) {
          newErrors.email = 'Este email já está cadastrado. Tente fazer login.';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateForm(false);
    if (!isValid) return;
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      let message = 'Erro ao entrar';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email ou senha incorretos';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Por favor, confirme seu email antes de entrar';
      }
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateForm(true);
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

    // Check if there's an invitation code to accept
    const inviteCode = localStorage.getItem('invite_code');
    if (inviteCode && data?.user?.id) {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.rpc('accept_invitation', { 
          _code: inviteCode, 
          _user_id: data.user.id 
        });
        localStorage.removeItem('invite_code');
      } catch (err) {
        console.error('Failed to accept invitation:', err);
      }
    }
    
    setLoading(false);
    toast({
      title: 'Cadastro realizado!',
      description: 'Verifique seu email para confirmar a conta',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
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
            <CardTitle className="text-2xl font-bold text-primary">Gente Networking</CardTitle>
            <CardDescription className="text-muted-foreground">
              Conectando pessoas, gerando negócios
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
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
                <Button type="submit" className="w-full" disabled={loading || checkingEmail}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}