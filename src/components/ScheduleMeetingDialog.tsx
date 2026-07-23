/**
 * ScheduleMeetingDialog — v3.31.0
 *
 * Agora envia uma SOLICITAÇÃO de "Agendar Gente em Ação" ao membro destinatário.
 * O convite de calendário (Google/.ics) só é liberado depois que o destinatário
 * confirmar a disponibilidade (ver `useMeetingRequests` + aba "Agendamentos").
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
import { CalendarClock, Send } from 'lucide-react';
import { useMeetingRequests } from '@/hooks/useMeetingRequests';

interface ScheduleMeetingDialogProps {
  recipientId: string;
  memberName: string;
  availabilityNote?: string | null;
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleMeetingDialog({ recipientId, memberName, availabilityNote }: ScheduleMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string>(defaultStart());
  const [duration, setDuration] = useState<string>('60');
  const [location, setLocation] = useState<string>('Online (videochamada)');
  const [message, setMessage] = useState<string>('');
  const { createRequest } = useMeetingRequests();

  const handleSubmit = () => {
    createRequest.mutate(
      {
        recipient_id: recipientId,
        proposed_start: start,
        duration_minutes: Number(duration) || 60,
        location,
        message,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarClock className="mr-2 h-4 w-4" /> Agendar Gente em Ação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar Gente em Ação</DialogTitle>
          <DialogDescription>
            Envie uma solicitação para {memberName}. O convite de calendário será liberado após a confirmação.
          </DialogDescription>
        </DialogHeader>

        {availabilityNote && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">Disponibilidade de {memberName}:</span>{' '}
            <span className="text-muted-foreground">{availabilityNote}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createRequest.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {createRequest.isPending ? 'Enviando...' : 'Enviar solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
