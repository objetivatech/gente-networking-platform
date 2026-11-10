/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlatformLogin } from '@/modules/lps/components/PlatformLogin';
import { MODULE_FEATURES } from '@/lib/plan-access';
import { formatCents } from '@/hooks/useBilling';
import { formatLpPhone, isValidLpPhone } from '@/modules/lps/lib/form-config';
import logo from '@/assets/gente-networking-cor-cropped.png';
import { ArrowRight, Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { z } from 'zod';

type Plan = { id: string; name: string; description: string | null; amount_cents: number; features: Record<string, unknown> };
type Contract = { id: string; status: string; amount_cents: number; payment_url: string | null; plan: { name: string } | null };
async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('subscriber-checkout', { body });
  if (error) {
    const response = 'context' in error && error.context instanceof Response ? await error.context.json().catch(() => null) : null;
    throw new Error(response?.error ?? 'Não foi possível concluir a solicitação. Tente novamente.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AssinarComunidade() {
  const { user, loading, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [selected, setSelected] = useState<string>('');
  const [cpf, setCpf] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', company: '', segment: '', password: '', confirm: '' });
  const plans = useQuery({ queryKey: ['self-service-plans'], queryFn: async () => (await invoke({ action: 'plans' })).plans as Plan[], retry: false });
  const status = useQuery({ queryKey: ['self-service-contract', user?.id], enabled: !!user, queryFn: async () => (await invoke({ action: 'status' })).contract as Contract | null, retry: false });
  const plan = plans.data?.find(p => p.id === selected);
  const contract = status.data;
  const signup = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!draft.name.trim() || !draft.company.trim() || !draft.segment.trim() || !z.string().email().safeParse(draft.email.trim()).success || !isValidLpPhone(draft.phone) || draft.password.length < 8 || draft.password !== draft.confirm) { setError('Confira seus dados. A senha deve ter ao menos 8 caracteres e coincidir com a confirmação.'); return; }
    if (!consent) { setError('Confirme os termos para continuar.'); return; }
    setBusy(true);
    try {
      const result = await signUp(draft.email.trim().toLowerCase(), draft.password, draft.name.trim(), draft.phone.replace(/\D/g, ''), draft.company.trim(), draft.segment.trim());
      if (result.error) { setError('Não foi possível cadastrar. Se já possui conta, entre ou recupere sua senha.'); return; }
      setDraft(prev => ({ ...prev, password: '', confirm: '' }));
      const { data } = await supabase.auth.getSession();
      if (!data.session) setMessage('Confira seu e-mail para confirmar a conta. Depois, entre aqui e prossiga com o pagamento.');
    } catch { setError('Não foi possível cadastrar. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const start = async () => {
    setBusy(true); setError('');
    try {
      const result = await invoke({ action: 'start', plan_id: selected, cpf_cnpj: cpf.replace(/\D/g, ''), consent });
      window.location.assign(result.payment_url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível iniciar o pagamento.'); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!contract || !window.confirm('Cancelar a assinatura e interromper novas cobranças? O acesso pago será encerrado.')) return;
    setBusy(true); setError('');
    try { await invoke({ action: 'cancel', contract_id: contract.id }); await status.refetch(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível cancelar.'); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4"><Link to="/assinantes"><img src={logo} alt="Gente Networking" className="h-12 w-36 object-contain" /></Link><Button variant="ghost" asChild><Link to={user ? '/' : '/auth?entrar=1'}>{user ? 'Ir para a plataforma' : 'Entrar'}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></header>
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
      <p className="text-sm font-semibold text-accent-foreground">Assinante da Comunidade</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Sua assinatura no Gente</h1><p className="mt-4 max-w-2xl text-muted-foreground">Conexões e recursos conforme seu plano. A participação nos Grupos Premium exige uma contratação própria.</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <section className="min-w-0" aria-label="Planos disponíveis"><h2 className="text-xl font-semibold">Escolha seu plano</h2>
          {plans.isPending ? <p role="status" className="mt-6">Consultando planos…</p> : plans.error ? <div className="mt-6"><p role="alert">Não foi possível consultar os planos.</p><Button variant="outline" onClick={() => plans.refetch()} className="mt-4"><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></div> : !plans.data?.length ? <p className="mt-6 text-muted-foreground">As ofertas de assinatura ainda não foram liberadas. Volte em breve.</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">{plans.data.map(item => <article key={item.id} className={`min-w-0 rounded-lg border p-6 ${selected === item.id ? 'border-primary bg-muted/40' : 'bg-card'}`}><h3 className="text-xl font-semibold text-wrap-anywhere">{item.name}</h3><p className="mt-3 text-2xl font-bold">{formatCents(item.amount_cents)}<span className="ml-1 text-sm font-normal text-muted-foreground">/mês</span></p>{item.description && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground text-wrap-anywhere">{item.description}</p>}<ul className="mt-5 space-y-2 text-sm">{Object.entries(MODULE_FEATURES).filter(([key]) => item.features[key] === true).map(([key, label]) => <li key={key} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{label}</li>)}{typeof item.features.matchmaking_monthly_quota === 'number' && <li>{item.features.matchmaking_monthly_quota} sorteios extras de MatchMaking/mês</li>}</ul><Button variant={selected === item.id ? 'secondary' : 'outline'} className="mt-6 w-full" onClick={() => setSelected(item.id)}>{selected === item.id ? 'Plano selecionado' : 'Escolher plano'}</Button></article>)}</div>}
        </section>
        <section className="min-w-0 border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" aria-label="Contratação">
          {loading ? <p role="status">Carregando sua conta…</p> : !user ? <><h2 className="text-xl font-semibold">{mode === 'signup' ? 'Crie sua conta' : 'Entre na sua conta'}</h2><div className="my-5 flex gap-3"><Button variant={mode === 'signup' ? 'secondary' : 'ghost'} onClick={() => setMode('signup')}>Nova conta</Button><Button variant={mode === 'login' ? 'secondary' : 'ghost'} onClick={() => setMode('login')}>Já tenho conta</Button></div>{mode === 'login' ? <PlatformLogin onSuccess={() => { setError(''); setMessage(''); }} /> : <form onSubmit={signup} className="space-y-4" data-rd-no-capture="true">{([{ key: 'name', label: 'Nome completo', type: 'text' }, { key: 'email', label: 'E-mail', type: 'email' }, { key: 'phone', label: 'WhatsApp com DDD', type: 'tel' }, { key: 'company', label: 'Empresa', type: 'text' }, { key: 'segment', label: 'Segmento de atuação', type: 'text' }, { key: 'password', label: 'Senha', type: 'password' }, { key: 'confirm', label: 'Confirmar senha', type: 'password' }] as const).map(field => <div key={field.key} className="space-y-2"><Label htmlFor={`signup-${field.key}`}>{field.label}</Label><Input id={`signup-${field.key}`} type={field.type} required maxLength={field.type === 'password' ? 72 : 150} value={draft[field.key]} autoComplete={field.type === 'password' ? 'new-password' : field.key === 'email' ? 'email' : 'off'} onChange={e => setDraft(prev => ({ ...prev, [field.key]: field.key === 'phone' ? formatLpPhone(e.target.value) : e.target.value }))} /></div>)}<div className="flex items-start gap-3"><Checkbox id="signup-consent" checked={consent} onCheckedChange={v => setConsent(v === true)} /><Label htmlFor="signup-consent" className="text-sm leading-relaxed">Li e aceito os termos e a política de privacidade apresentados nesta contratação.</Label></div><Button type="submit" disabled={busy || !plans.data?.length} className="w-full">{busy ? 'Criando conta…' : 'Criar conta e continuar'}</Button></form>}</> : <><h2 className="text-xl font-semibold">Pagamento e acesso</h2><p className="mt-3 text-sm text-muted-foreground">Conta: {user.email}</p>{status.isPending ? <p role="status" className="mt-5">Consultando assinatura…</p> : status.error ? <p role="alert" className="mt-5 text-destructive">{status.error.message}</p> : contract?.status === 'active' ? <div className="mt-6 space-y-4"><p className="flex gap-2 font-medium"><ShieldCheck className="h-5 w-5 text-primary" />Pagamento confirmado · {contract.plan?.name}</p><Button asChild className="w-full"><Link to="/">Acessar a plataforma<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button variant="ghost" disabled={busy} onClick={cancel}>Cancelar assinatura</Button></div> : <div className="mt-6 space-y-5">{contract && !['canceled', 'completed'].includes(contract.status) && <p className="text-sm text-muted-foreground">{contract.status === 'past_due' ? 'Pagamento pendente ou período pago encerrado.' : 'Sua contratação aguarda pagamento.'} {contract.plan?.name}</p>}{contract?.payment_url && !['canceled', 'completed'].includes(contract.status) && <Button asChild className="w-full"><a href={contract.payment_url}>Retomar pagamento no Asaas<ArrowRight className="ml-2 h-4 w-4" /></a></Button>}<div className="space-y-2"><Label htmlFor="cpf-cnpj">CPF ou CNPJ do pagador</Label><Input id="cpf-cnpj" inputMode="numeric" maxLength={18} value={cpf} onChange={e => setCpf(e.target.value.replace(/[^\d./-]/g, ''))} /></div><div className="flex items-start gap-3"><Checkbox id="payment-consent" checked={consent} onCheckedChange={v => setConsent(v === true)} /><Label htmlFor="payment-consent" className="text-sm leading-relaxed">Concordo com a contratação mensal de {plan?.name ?? 'um plano selecionado'}{plan ? ` por ${formatCents(plan.amount_cents)}` : ''}, com renovação e liberação dos recursos após confirmação do pagamento.</Label></div><Button disabled={busy || !plan || !consent || ![11, 14].includes(cpf.replace(/\D/g, '').length)} onClick={start} className="w-full">{busy ? 'Preparando pagamento…' : 'Continuar para o Asaas'}<ArrowRight className="ml-2 h-4 w-4" /></Button><p className="text-xs leading-relaxed text-muted-foreground">Pagamento realizado na página segura do Asaas. Pix ou cartão dependem das formas disponíveis nessa cobrança. Criar a conta ou voltar da página de pagamento não libera os recursos.</p>{contract && !['canceled', 'completed'].includes(contract.status) && <Button variant="ghost" disabled={busy} onClick={cancel}>Cancelar contratação</Button>}</div>}<Button variant="outline" className="mt-5" onClick={() => status.refetch()} disabled={status.isFetching}><RefreshCw className="mr-2 h-4 w-4" />{status.isFetching ? 'Conferindo…' : 'Conferir pagamento'}</Button></>}
          {message && <p role="status" className="mt-5 text-sm">{message}</p>}{error && <p role="alert" className="mt-5 text-sm text-destructive text-wrap-anywhere">{error}</p>}
        </section>
      </div>
    </main>
  </div>;
}