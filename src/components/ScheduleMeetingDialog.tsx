/**
 * ScheduleMeetingDialog — v3.31.0
 *
 * Agora envia uma SOLICITAÇÃO de "Agendar Gente em Ação" ao membro destinatário.
 * O convite de calendário (Google/.ics) só é liberado depois que o destinatário
 * confirmar a disponibilidade (ver `useMeetingRequests` + aba "Agendamentos").
 * Após a criação, oferece reforço manual por WhatsApp sem presumir o envio.
 *
 * @author Diogo Devitte / Ranktop
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Check, Copy, MessageCircle, Send } from 'lucide-react';
import { useMeetingRequests } from '@/hooks/useMeetingRequests';
import { useToast } from '@/hooks/use-toast';
import {
  buildSchedulingWhatsAppMessage,
  buildSchedulingWhatsAppUrl,
  normalizeBrazilianWhatsAppPhone,
} from '@/lib/whatsapp-scheduling';

interface ScheduleMeetingDialogProps {
  recipientId: string;
  memberName: string;
  availabilityNote?: string | null;
  className?: string;
  variant?: 'default' | 'outline';
  /** Chamado após o envio da solicitação (usado pelo MatchMaking para contar tentativas). */
  onScheduled?: () => void;
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleMeetingDialog({ recipientId, memberName, availabilityNote, className, variant = 'outline', onScheduled }: ScheduleMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string>(defaultStart());
  const [duration, setDuration] = useState<string>('60');
  const [location, setLocation] = useState<string>('Online (videochamada)');
  const [message, setMessage] = useState<string>('');
  const [completed, setCompleted] = useState<{ requestId: string; whatsappMessage: string; phone: string | null } | null>(null);
  const { createRequest, registerWhatsAppOpen } = useMeetingRequests();
  const { toast } = useToast();

  const closeDialog = () => {
    setOpen(false);
    setCompleted(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setCompleted(null);
  };

  const handleSubmit = () => {
    createRequest.mutate(
      {
        recipient_id: recipientId,
        proposed_start: start,
        duration_minutes: Number(duration) || 60,
        location,
        message,
      },
      {
        onSuccess: (result) => {
          const whatsappMessage = buildSchedulingWhatsAppMessage({
            recipientName: result.recipientName,
            requesterName: result.requesterName,
            proposedStart: result.request.proposed_start,
            durationMinutes: result.request.duration_minutes,
            location: result.request.location,
          });
          setCompleted({
            requestId: result.request.id,
            whatsappMessage,
            phone: normalizeBrazilianWhatsAppPhone(result.recipientPhone),
          });
          onScheduled?.();
        },
      },
    );
  };

  const handleOpenWhatsApp = () => {
    if (!completed?.phone) return;
    window.open(buildSchedulingWhatsAppUrl(completed.phone, completed.whatsappMessage), '_blank', 'noopener,noreferrer');
    registerWhatsAppOpen.mutate(completed.requestId);
  };

  const handleCopyMessage = async () => {
    if (!completed) return;
    try {
      await navigator.clipboard.writeText(completed.whatsappMessage);
      toast({ title: 'Mensagem copiada!', description: 'Agora você pode colar e editar no WhatsApp.' });
    } catch {
      toast({ title: 'Não foi possível copiar', description: 'Selecione e copie a mensagem abaixo.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <CalendarClock className="mr-2 h-4 w-4" /> Agendar Gente em Ação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{completed ? 'Solicitação enviada' : 'Agendar Gente em Ação'}</DialogTitle>
          <DialogDescription>
            {completed
              ? 'O e-mail e a notificação foram enviados. Você também pode reforçar o convite pelo WhatsApp.'
              : `Envie uma solicitação para ${memberName}. O convite de calendário será liberado após a confirmação.`}
          </DialogDescription>
        </DialogHeader>

        {!completed && availabilityNote && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">Disponibilidade de {memberName}:</span>{' '}
            <span className="text-muted-foreground">{availabilityNote}</span>
          </div>
        )}

        {!completed ? <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="meet-start">Data e hora proposta</Label>
            <Input id="meet-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meet-duration">Duração</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="meet-duration"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1h30</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meet-location">Local</Label>
            <Input id="meet-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Online, endereço ou link" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meet-msg">Mensagem (opcional)</Label>
            <Textarea id="meet-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sobre o que você gostaria de conversar?" rows={3} />
          </div>
        </div> : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm">A solicitação foi criada sem gerar pontuação ou outro agendamento.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-message">Mensagem sugerida</Label>
              <Textarea id="whatsapp-message" value={completed.whatsappMessage} readOnly rows={7} />
              {!completed.phone && (
                <p className="text-sm text-muted-foreground">Telefone não cadastrado ou inválido. Você ainda pode copiar a mensagem.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {completed ? (
            <>
              <Button variant="outline" onClick={closeDialog}>Concluir sem WhatsApp</Button>
              <Button variant="outline" onClick={handleCopyMessage}>
                <Copy className="mr-2 h-4 w-4" /> Copiar mensagem
              </Button>
              {completed.phone && (
                <Button onClick={handleOpenWhatsApp}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Abrir WhatsApp e enviar
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createRequest.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {createRequest.isPending ? 'Enviando...' : 'Enviar solicitação'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
