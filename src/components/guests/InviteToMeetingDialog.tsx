/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { buildReinviteMessage, toWhatsAppDigits } from '@/lib/reinvite-message';
import { formatDateBR } from '@/lib/date-utils';
import type { Meeting } from '@/hooks/useMeetings';
import { UserPlus, Loader2, MessageCircle, Copy, Mail } from 'lucide-react';
export function InviteToMeetingDialog({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [result, setResult] = useState<{ message: string; emailSent: boolean; reference: string; kind: string; phone: string | null } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('guest-meetings', { body: { action: 'invite', meeting_id: meeting.id, ...form } });
      if (error || data?.error) throw new Error(data?.error ?? 'Não foi possível salvar o convite');
      const link = data.code ? `https://comunidade.gentenetworking.com.br/convite/${data.code}` : 'https://comunidade.gentenetworking.com.br/';
      setResult({ message: `${buildReinviteMessage({ guestName: data.guest_name ?? form.name, teamName: meeting.team?.name ?? meeting.title, meetingDate: meeting.meeting_date, meetingTime: meeting.meeting_time, location: meeting.location })}\nAcesse para confirmar: ${link}`, emailSent: data.email_sent, reference: data.participation_id ?? data.invitation_id, kind: data.participation_id ? 'premium' : 'meeting_invitation', phone: data.guest_phone ?? form.phone });
      for (const key of ['invitations', 'guests-directory', 'guest-agenda', 'crm-leads', 'meeting-invitations']) qc.invalidateQueries({ queryKey: [key] });
      toast({ title: 'Convite registrado', description: data.email_sent ? 'E-mail enviado. Você também pode enviar pelo WhatsApp.' : 'E-mail não enviado. O convite está salvo; tente o envio novamente.' });
    } catch (error) { toast({ title: 'Não foi possível convidar', description: error instanceof Error ? error.message : 'Tente novamente', variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const retryEmail = async () => {
    if (!result) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('community-notification', { body: { kind: result.kind, reference_id: result.reference } });
    setBusy(false);
    if (!error && data?.success) setResult({ ...result, emailSent: true });
    else toast({ title: 'E-mail não enviado', description: 'O convite continua salvo. Tente novamente mais tarde.', variant: 'destructive' });
  };
  const digits = toWhatsAppDigits(result?.phone);
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { setResult(null); setForm({ name: '', email: '', phone: '', company: '' }); } }}>
    <DialogTrigger asChild><Button variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-2" />Adicionar Convidado</Button></DialogTrigger>
    <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Convidar para este encontro</DialogTitle><DialogDescription>{meeting.team?.name ?? meeting.title} · {formatDateBR(meeting.meeting_date)}{meeting.meeting_time ? ` · ${meeting.meeting_time.slice(0, 5)}` : ''}</DialogDescription></DialogHeader>
      {!result ? <form onSubmit={save} className="space-y-4" data-rd-no-capture="true">
        <div className="space-y-2"><Label htmlFor="event-guest-name">Nome</Label><Input id="event-guest-name" required minLength={2} maxLength={255} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="event-guest-email">E-mail</Label><Input id="event-guest-email" type="email" required maxLength={255} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="event-guest-phone">WhatsApp</Label><Input id="event-guest-phone" type="tel" maxLength={40} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="event-guest-company">Empresa</Label><Input id="event-guest-company" maxLength={255} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar Convite</Button>
      </form> : <div className="space-y-3"><p className="text-sm">{result.emailSent ? 'E-mail enviado.' : 'Convite salvo, mas o e-mail não foi enviado.'}</p>{!result.emailSent && <Button variant="outline" disabled={busy} onClick={retryEmail}><Mail className="h-4 w-4 mr-2" />Tentar enviar e-mail</Button>}<Label htmlFor="event-guest-message">Mensagem para WhatsApp</Label><Textarea id="event-guest-message" rows={7} value={result.message} onChange={e => setResult({ ...result, message: e.target.value })} /><div className="flex flex-col gap-2"><Button variant="outline" onClick={() => navigator.clipboard.writeText(result.message)}><Copy className="h-4 w-4 mr-2" />Copiar mensagem</Button><Button asChild><a href={`https://wa.me/${digits ?? ''}?text=${encodeURIComponent(result.message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 mr-2" />Enviar WhatsApp</a></Button></div></div>}
    </DialogContent>
  </Dialog>;
}