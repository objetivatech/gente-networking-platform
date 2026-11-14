/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { Calendar, Clock, MapPin, CheckCircle, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGuestAgenda } from '@/hooks/useGuestAgenda';
import { agendaAction } from '@/lib/guest-agenda';
import { formatDateBR } from '@/lib/date-utils';
import { toWhatsAppDigits } from '@/lib/reinvite-message';
export function GuestAgenda({ subscriber = false }: { subscriber?: boolean }) {
  const { data: meetings = [], isLoading, isError, refetch, confirmation } = useGuestAgenda();
  return <section className="space-y-4" aria-labelledby="guest-agenda-title">
    <h2 id="guest-agenda-title" className="text-xl font-semibold flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Agenda de Encontros</h2>
    {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando agenda" />}
    {isError && <div className="space-y-2"><p className="text-destructive">Não foi possível carregar os encontros.</p><Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div>}
    {!isLoading && !isError && !meetings.length && <p className="text-muted-foreground">Em breve teremos novos encontros!</p>}
    {meetings.map(meeting => {
      const action = agendaAction(meeting);
      return <article key={meeting.id} className="rounded-lg border bg-card p-4 space-y-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-wrap-anywhere">{meeting.title}</h3><Badge variant="secondary">{meeting.event_type === 'hub_event' ? subscriber ? 'Gente HUB' : 'Gente HUB · aberto' : meeting.team_name ?? 'Grupo Premium'}</Badge>{meeting.is_attending && <Badge>Presença confirmada</Badge>}</div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDateBR(meeting.meeting_date)}</span>{meeting.meeting_time && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{meeting.meeting_time.slice(0, 5)}</span>}{meeting.location && <span className="flex items-start gap-1 min-w-0"><MapPin className="h-4 w-4 shrink-0" /><span className="text-wrap-anywhere">{meeting.location}</span></span>}</div>
        {meeting.invited_by_name && <p className="text-sm">Você foi convidado por <strong>{meeting.invited_by_name}</strong>.</p>}
        {action === 'contact' ? <div className="space-y-2"><p className="text-sm text-muted-foreground">Você ainda não foi convidado para este encontro. Fale com o Facilitador do Grupo para participar.</p>{meeting.facilitators?.map(facilitator => {
          const digits = toWhatsAppDigits(facilitator.phone);
          return digits ? <Button key={facilitator.name} variant="outline" size="sm" asChild><a href={`https://wa.me/${digits}?text=${encodeURIComponent(`Olá, ${facilitator.name}! Gostaria de conhecer o Grupo ${meeting.team_name ?? ''} e participar do encontro de ${formatDateBR(meeting.meeting_date)}.`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar com {facilitator.name}</a></Button> : <p key={facilitator.name} className="text-sm">Facilitador: {facilitator.name}</p>;
        })}{!meeting.facilitators?.length && <p className="text-sm text-muted-foreground">Converse com seu anfitrião para solicitar um convite.</p>}</div> : <Button variant={action === 'cancel' ? 'outline' : 'default'} disabled={confirmation.isPending} onClick={() => confirmation.mutate({ meetingId: meeting.id, confirm: action === 'confirm' })}><CheckCircle className="mr-2 h-4 w-4" />{action === 'cancel' ? 'Cancelar Presença' : meeting.event_type === 'hub_event' ? 'Confirmar Presença no Gente HUB' : 'Confirmar Presença'}</Button>}
      </article>;
    })}
  </section>;
}