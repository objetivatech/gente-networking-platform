/**
 * ScheduleMeetingDialog - Diálogo de agendamento de reunião 1x1 (Item 2 / Fase 4).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Permite agendar um "Gente em Ação" (reunião 1x1) com um membro, gerando um
 * link de Google Calendar ou um arquivo .ics — sem integração OAuth externa.
 * Exibe a disponibilidade declarada pelo membro (availability_note) como apoio.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, CalendarPlus, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGoogleCalendarUrl, downloadIcs, type MeetingSchedule } from '@/lib/scheduling-utils';

interface ScheduleMeetingDialogProps {
  memberName: string;
  availabilityNote?: string | null;
  requesterName?: string | null;
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  // input datetime-local espera "YYYY-MM-DDTHH:mm" no horário local
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleMeetingDialog({ memberName, availabilityNote, requesterName }: ScheduleMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string>(defaultStart());
  const [duration, setDuration] = useState<string>('60');
  const [location, setLocation] = useState<string>('Online (videochamada)');
  const { toast } = useToast();

  const buildSchedule = (): MeetingSchedule => ({
    title: `Gente em Ação (1x1) — ${requesterName ? `${requesterName} & ` : ''}${memberName}`,
    description: `Reunião 1x1 agendada pela plataforma Gente Networking.${availabilityNote ? `\nDisponibilidade informada: ${availabilityNote}` : ''}`,
    location,
    start,
    durationMinutes: Number(duration) || 60,
  });

  const handleGoogle = () => {
    window.open(buildGoogleCalendarUrl(buildSchedule()), '_blank', 'noopener,noreferrer');
    toast({ title: 'Google Calendar aberto', description: 'Confirme os detalhes e salve o evento.' });
  };

  const handleIcs = () => {
    downloadIcs(buildSchedule(), `1x1-${memberName.toLowerCase().replace(/\s+/g, '-')}.ics`);
    toast({ title: 'Convite .ics baixado', description: 'Abra o arquivo para adicionar ao seu calendário.' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarClock className="mr-2 h-4 w-4" /> Agendar 1x1
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar reunião 1x1</DialogTitle>
          <DialogDescription>
            Crie um convite de calendário para um Gente em Ação com {memberName}.
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
            <Label htmlFor="meet-start">Data e hora</Label>
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
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleIcs} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Baixar .ics
          </Button>
          <Button onClick={handleGoogle} className="w-full sm:w-auto">
            <CalendarPlus className="mr-2 h-4 w-4" /> Google Calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
