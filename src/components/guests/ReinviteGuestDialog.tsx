/**
 * Reconvite de convidado para um encontro futuro, com mensagem pronta de WhatsApp.
 * As permissões por papel são verificadas no servidor (reinvite_guest_to_meeting).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDateBR, todayLocalISODate } from '@/lib/date-utils';
import { CalendarPlus, Copy, MessageCircle, Loader2 } from 'lucide-react';
import { buildReinviteMessage, toWhatsAppDigits } from '@/lib/reinvite-message';

interface Props {
  guestId: string;
  guestName: string;
  /** Limita a lista a encontros destes Grupos (ex.: Grupos do Membro). Vazio = todos visíveis. */
  teamIds?: string[];
  triggerLabel?: string;
}

export function ReinviteGuestDialog({ guestId, guestName, teamIds, triggerLabel = 'Reconvidar' }: Props) {
  const [open, setOpen] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['reinvite-meetings', teamIds?.join(',') ?? 'all'],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from('meetings')
        .select('id, title, meeting_date, meeting_time, location, team_id, teams(name)')
        .gte('meeting_date', todayLocalISODate())
        .order('meeting_date', { ascending: true })
        .limit(50);
      if (teamIds && teamIds.length > 0) q = q.in('team_id', teamIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const confirm = async () => {
    if (!meetingId) return;
    setSaving(true);
    const { data, error } = await supabase.rpc('reinvite_guest_to_meeting' as any, { _guest_id: guestId, _meeting_id: meetingId });
    setSaving(false);
    if (error) {
      toast({ title: 'Não foi possível reconvidar', description: error.message, variant: 'destructive' });
      return;
    }
    const r = data as any;
    setPhone(r.guest_phone ?? null);
    setMessage(buildReinviteMessage({
      guestName: r.guest_name ?? guestName,
      teamName: r.team_name,
      meetingDate: r.meeting_date,
      meetingTime: r.meeting_time,
      location: r.location,
    }));
    qc.invalidateQueries({ queryKey: ['guests-directory'] });
    toast({ title: 'Reconvite registrado', description: 'Agora envie a mensagem pelo WhatsApp.' });
  };

  const reset = (v: boolean) => {
    setOpen(v);
    if (!v) { setMeetingId(''); setMessage(''); setPhone(null); }
  };

  const digits = toWhatsAppDigits(phone);

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <CalendarPlus className="w-3 h-3 mr-1" />{triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reconvidar {guestName}</DialogTitle>
          <DialogDescription>Escolha o próximo encontro. A autoria do convite e os pontos continuam com quem convidou primeiro.</DialogDescription>
        </DialogHeader>
        {!message ? (
          <div className="space-y-4">
            <Select value={meetingId} onValueChange={setMeetingId}>
              <SelectTrigger><SelectValue placeholder={isLoading ? 'Carregando...' : 'Selecione o encontro'} /></SelectTrigger>
              <SelectContent>
                {meetings.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {formatDateBR(m.meeting_date)}{m.meeting_time ? ` ${String(m.meeting_time).slice(0, 5)}` : ''} · {m.teams?.name ?? m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && meetings.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum encontro futuro disponível para você.</p>
            )}
            <Button className="w-full" onClick={confirm} disabled={!meetingId || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Registrar reconvite
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="text-wrap-anywhere" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(message); toast({ title: 'Mensagem copiada' }); }}>
                <Copy className="w-4 h-4 mr-2" />Copiar mensagem
              </Button>
              <Button asChild className="flex-1">
                <a href={`https://wa.me/${digits ?? ''}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />Enviar WhatsApp
                </a>
              </Button>
            </div>
            {!digits && <p className="text-xs text-muted-foreground">Sem WhatsApp no cadastro: escolha o contato no próprio WhatsApp.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
