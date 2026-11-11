/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { formatLpPhone } from '@/modules/lps/lib/form-config';
import { validatePublicProfileInvite } from '../../../supabase/functions/_shared/public-profile-invite';

interface Props { slug: string; hostName: string; open: boolean; onOpenChange: (open: boolean) => void }
interface Group { id: string; name: string }

export default function PublicProfileInviteDialog({ slug, hostName, open, onOpenChange }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [accountExists, setAccountExists] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  const [values, setValues] = useState({ name: '', email: '', phone: '', company: '', team: '' });
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(''); setAccountExists(false); setSuccess(false);
    setGroups([]); setValues(v => ({ ...v, team: '' }));
    supabase.functions.invoke('submit-lead', { body: { action: 'public_profile_groups', profile_slug: slug } }).then(({ data, error: requestError }) => {
      if (!active) return;
      if (requestError || !Array.isArray(data?.groups)) setError('Não foi possível carregar os Grupos. Tente novamente.');
      else { setGroups(data.groups); if (data.groups.length === 1) setValues(v => ({ ...v, team: data.groups[0].id })); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [open, slug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const body = { profile_slug: slug, target_team_id: values.team, name: values.name.trim(), email: values.email.trim(), phone: values.phone, company: values.company.trim(), consent, action: 'public_profile_invitation' };
    const invalid = validatePublicProfileInvite(body);
    if (invalid) { setError(invalid === 'consent_required' ? 'Confirme que deseja receber o convite.' : 'Confira o nome, e-mail, WhatsApp com DDD e Grupo escolhido.'); return; }
    setPending(true); setError(''); setAccountExists(false);
    try {
      const { data, error: requestError } = await supabase.functions.invoke('submit-lead', { body });
      if (requestError || !data?.ok) {
        const response = requestError?.context;
        const details = response instanceof Response ? await response.json().catch(() => ({})) : data;
        if (details?.error === 'existing_account') { setAccountExists(true); setError('Você já tem um cadastro. Entre na plataforma para continuar; seu histórico foi preservado.'); }
        else setError(details?.error === 'rate_limited' ? 'Há muitas solicitações agora. Tente novamente mais tarde.' : 'Não foi possível enviar o convite. Confira os dados e tente novamente.');
        return;
      }
      setDeliveryFailed(data.delivery?.activation === 'error'); setSuccess(true);
      setValues({ name: '', email: '', phone: '', company: '', team: '' }); setConsent(false);
    } catch { setError('Não foi possível enviar. Tente novamente.'); }
    finally { setPending(false); }
  }

  return <Dialog open={open} onOpenChange={value => { if (!pending) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Quero conhecer o Grupo</DialogTitle><DialogDescription>Conheça o Grupo de {hostName}.</DialogDescription></DialogHeader>
      {loading ? <div className="flex justify-center py-8" role="status"><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">Carregando Grupos</span></div> : success ? <div className="space-y-4 py-4" role="status">
        <CheckCircle2 className="h-10 w-10 text-success" /><h3 className="font-semibold">Solicitação recebida!</h3>
        <p className="text-sm text-muted-foreground">{deliveryFailed ? 'Seu cadastro foi salvo, mas o e-mail ainda não foi entregue. A gestão pode reenviar o convite.' : 'Confira sua caixa de entrada e o spam. Se você já tinha um convite, ele foi preservado; não precisa começar de novo.'}</p>
        <Button className="w-full" onClick={() => onOpenChange(false)}>Concluir</Button>
      </div> : <>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {accountExists ? <Button asChild><Link to="/auth">Entrar na plataforma</Link></Button> : groups.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum Grupo disponível para convite neste perfil.</p> : <form data-rd-no-capture="true" onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="public-invite-name">Nome completo</Label><Input id="public-invite-name" autoComplete="name" required minLength={2} maxLength={120} value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="public-invite-email">E-mail</Label><Input id="public-invite-email" autoComplete="email" type="email" required maxLength={200} value={values.email} onChange={e => setValues(v => ({ ...v, email: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="public-invite-phone">WhatsApp com DDD</Label><Input id="public-invite-phone" autoComplete="tel" type="tel" required maxLength={20} placeholder="(51) 99999-9999" value={values.phone} onChange={e => setValues(v => ({ ...v, phone: formatLpPhone(e.target.value) }))} /></div>
          <div className="space-y-2"><Label htmlFor="public-invite-company">Empresa (opcional)</Label><Input id="public-invite-company" autoComplete="organization" maxLength={200} value={values.company} onChange={e => setValues(v => ({ ...v, company: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="public-invite-team">Grupo</Label><Select value={values.team} onValueChange={team => setValues(v => ({ ...v, team }))}><SelectTrigger id="public-invite-team"><SelectValue placeholder="Escolha um Grupo" /></SelectTrigger><SelectContent>{groups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-start gap-3"><Checkbox id="public-invite-consent" checked={consent} onCheckedChange={value => setConsent(value === true)} /><Label htmlFor="public-invite-consent" className="text-sm font-normal leading-relaxed">Quero receber o convite e autorizo o uso destes dados para organizar minha participação.</Label></div>
          <Button type="submit" disabled={pending} className="h-auto min-h-11 w-full whitespace-normal">{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Receber meu convite</Button>
        </form>}
      </>}
    </DialogContent>
  </Dialog>;
}