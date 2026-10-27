/**
 * Convite em página única: contexto do anfitrião + cadastro instantâneo.
 * A conta nasce confirmada e a presença no próximo encontro é registrada
 * pelo servidor (complete-guest-signup), sem 2º e-mail.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { useToast } from '@/hooks/use-toast';
import { formatDateBR } from '@/lib/date-utils';
import { CalendarDays, Clock, MapPin, Users, XCircle, Loader2 } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
const logoGente = '/logo-gente-networking-branco.png';

interface Welcome {
  valid: boolean;
  reason?: string;
  code?: string;
  name?: string | null;
  email?: string | null;
  invite_purpose?: string;
  host_name?: string | null;
  host_company?: string | null;
  host_avatar?: string | null;
  team_name?: string | null;
  meeting?: { id: string; title: string; meeting_date: string; meeting_time: string | null; location: string | null } | null;
}

const formatPhoneBR = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const ERRORS: Record<string, string> = {
  email_exists: 'Este e-mail já tem conta. Entre com sua senha para continuar.',
  email_mismatch: 'Use o mesmo e-mail que recebeu o convite.',
  invalid_invitation: 'Este convite não é mais válido. Peça um novo a quem te convidou.',
  invalid_input: 'Confira os campos: WhatsApp com DDD e senha de pelo menos 6 caracteres.',
};

export default function ConvitePublico() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [welcome, setWelcome] = useState<Welcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company: '', business_segment: '', password: '' });

  useEffect(() => { if (user && !submitting) navigate('/'); }, [user, submitting, navigate]);

  useEffect(() => {
    (async () => {
      if (!code) { setLoading(false); return; }
      const { data } = await supabase.rpc('get_invitation_welcome' as any, { _code: code });
      const w = (data as unknown as Welcome) ?? { valid: false };
      setWelcome(w);
      if (w.valid) setForm((f) => ({ ...f, full_name: w.name ?? '', email: w.email ?? '' }));
      setLoading(false);
    })();
  }, [code]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'phone' ? formatPhoneBR(e.target.value) : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    const email = form.email.trim().toLowerCase();
    const { data, error } = await supabase.functions.invoke('complete-guest-signup', {
      body: { ...form, email, phone: form.phone.replace(/\D/g, ''), code },
    });
    if (error || !data?.success) {
      let key = 'generic';
      try { key = (await (error as any)?.context?.json?.())?.error ?? data?.error ?? key; } catch { /* noop */ }
      setErrorKey(key);
      setSubmitting(false);
      return;
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: form.password });
    const m = data.meeting;
    toast({
      title: 'Vaga confirmada!',
      description: m ? `Sua presença está confirmada no encontro de ${formatDateBR(m.meeting_date)}${m.meeting_time ? ` às ${String(m.meeting_time).slice(0, 5)}` : ''}.` : 'Sua conta foi ativada.',
    });
    navigate(loginError ? '/auth' : '/');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const m = welcome?.meeting;
  const hostInitials = (welcome?.host_name ?? 'G').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <SEO title="Convite Gente Networking" description="Confirme sua vaga no próximo encontro do Gente Networking." />
      <header className="bg-primary py-4 flex justify-center">
        <img src={logoGente} alt="Gente Networking" className="h-12 w-auto" />
      </header>
      <main className="flex-1 flex justify-center p-4">
        {!welcome?.valid ? (
          <Card className="w-full max-w-md self-center">
            <CardContent className="pt-6 text-center space-y-4">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold">Convite indisponível</h1>
              <p className="text-sm text-muted-foreground">
                {welcome?.reason === 'expired' ? 'Este convite venceu.' : welcome?.reason === 'used' ? 'Este convite já foi utilizado.' : 'Não encontramos este convite.'}{' '}
                Peça um novo a quem te convidou.
              </p>
              <Button variant="outline" onClick={() => navigate('/auth')}>Já tenho conta</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full max-w-4xl grid gap-6 md:grid-cols-2 items-start">
            <section className="space-y-4 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                {welcome.name ? `${welcome.name.split(' ')[0]}, você` : 'Você'} foi convidado(a)!
              </h1>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={welcome.host_avatar ?? undefined} />
                    <AvatarFallback>{hostInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Convite de</p>
                    <p className="font-semibold text-wrap-anywhere">{welcome.host_name ?? 'Gente Networking'}</p>
                    {welcome.host_company && <p className="text-sm text-muted-foreground text-wrap-anywhere">{welcome.host_company}</p>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 space-y-2 text-sm">
                  {welcome.team_name && <p className="flex items-center gap-2"><Users className="h-4 w-4 text-secondary" />Grupo {welcome.team_name}</p>}
                  {m ? (
                    <>
                      <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-secondary" />{formatDateBR(m.meeting_date)}</p>
                      {m.meeting_time && <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-secondary" />{String(m.meeting_time).slice(0, 5)}</p>}
                      {m.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-secondary" /><span className="text-wrap-anywhere">{m.location}</span></p>}
                      <p className="pt-2 text-muted-foreground">Ao concluir, sua presença neste encontro já fica confirmada.</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Assim que o próximo encontro for agendado, você poderá confirmar sua presença na plataforma.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={submit} className="space-y-3" data-rd-no-capture="true">
                  <div className="space-y-1"><Label htmlFor="g-name">Nome completo</Label><Input id="g-name" value={form.full_name} onChange={set('full_name')} required /></div>
                  <div className="space-y-1">
                    <Label htmlFor="g-email">E-mail</Label>
                    <Input id="g-email" type="email" value={form.email} onChange={set('email')} readOnly={!!welcome.email} required />
                  </div>
                  <div className="space-y-1"><Label htmlFor="g-phone">WhatsApp</Label><Input id="g-phone" type="tel" placeholder="(51) 99999-9999" value={form.phone} onChange={set('phone')} required /></div>
                  <div className="space-y-1"><Label htmlFor="g-company">Empresa</Label><Input id="g-company" value={form.company} onChange={set('company')} required /></div>
                  <div className="space-y-1"><Label htmlFor="g-seg">Segmento</Label><Input id="g-seg" placeholder="Ex: Advocacia, Tecnologia..." value={form.business_segment} onChange={set('business_segment')} required /></div>
                  <div className="space-y-1">
                    <Label htmlFor="g-pass">Crie uma senha</Label>
                    <Input id="g-pass" type="password" minLength={6} value={form.password} onChange={set('password')} required />
                    <PasswordStrengthIndicator password={form.password} />
                  </div>
                  {errorKey && (
                    <div className="text-sm text-destructive space-y-1" role="alert">
                      <p>{ERRORS[errorKey] ?? 'Não foi possível concluir agora. Tente novamente.'}</p>
                      {errorKey === 'email_exists' && <Link className="underline" to="/auth">Entrar na minha conta</Link>}
                    </div>
                  )}
                  <Button type="submit" size="lg" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar minha vaga
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Já tem conta? <Link className="underline" to="/auth">Entrar</Link></p>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
