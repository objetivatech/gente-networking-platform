/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
export function PlatformLogin() {
  const { signIn, resetPassword } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!z.string().email().safeParse(email.trim()).success) { setError('Informe um e-mail válido.'); return; }
    if (!recovery && !password) { setError('Informe sua senha.'); return; }
    setBusy(true);
    try {
      const { error: failure } = recovery ? await resetPassword(email.trim()) : await signIn(email.trim(), password);
      if (failure) { setError(recovery ? 'Não foi possível enviar o link. Tente novamente.' : failure.message.includes('Email not confirmed') ? 'Confirme seu e-mail antes de entrar.' : 'Não foi possível entrar. Confira seu e-mail e senha.'); return; }
      if (recovery) toast({ title: 'Verifique seu e-mail', description: 'Se houver uma conta, você receberá o link de recuperação.' });
    } catch { setError('Não foi possível conectar. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="space-y-5" data-rd-no-capture="true">
    {recovery && <p className="text-sm text-muted-foreground">Receba um link para redefinir sua senha.</p>}
    <div className="space-y-2"><Label htmlFor="login-email">E-mail</Label><Input id="login-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
    {!recovery && <div className="space-y-2"><Label htmlFor="login-password">Senha</Label><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button className="w-full" type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{recovery ? 'Enviar link de recuperação' : busy ? 'Entrando…' : 'Entrar'}</Button>
    <Button variant="link" className="w-full" type="button" onClick={() => { setRecovery(!recovery); setError(''); }}>{recovery && <ArrowLeft className="mr-2 h-4 w-4" />}{recovery ? 'Voltar para entrar' : 'Esqueci minha senha'}</Button>
  </form>;
}