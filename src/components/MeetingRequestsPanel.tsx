/**
 * MeetingRequestsPanel — v3.31.0
 *
 * Lista solicitações de Gente em Ação (recebidas e enviadas) com ações
 * de confirmar/recusar/cancelar e, para as confirmadas, botões de
 * Google Calendar e .ics reaproveitando `scheduling-utils`.
 *
 * @author Diogo Devitte / Ranktop
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarClock, CalendarPlus, Check, Download, Loader2, MapPin, MessageSquare, X } from 'lucide-react';
import { useMeetingRequests, type MeetingRequest } from '@/hooks/useMeetingRequests';
import { buildGoogleCalendarUrl, downloadIcs } from '@/lib/scheduling-utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

function statusBadge(status: MeetingRequest['status']) {
  switch (status) {
    case 'pending':   return <Badge variant="outline">Pendente</Badge>;
    case 'confirmed': return <Badge className="bg-green-600 hover:bg-green-700">Confirmado</Badge>;
    case 'declined':  return <Badge variant="secondary">Recusado</Badge>;
    case 'cancelled': return <Badge variant="secondary">Cancelado</Badge>;
  }
}

function initials(name?: string | null) {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function MeetingRequestsPanel() {
  const { user } = useAuth();
  const { sent, received, isLoading, respond, cancel } = useMeetingRequests();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderCard = (r: MeetingRequest, viewerRole: 'requester' | 'recipient') => {
    const other = viewerRole === 'requester' ? r.recipient : r.requester;
    const startDate = new Date(r.proposed_start);
    const canCalendar = r.status === 'confirmed';
    const schedule = {
      title: `Gente em Ação (1x1) — ${r.requester?.full_name || ''} & ${r.recipient?.full_name || ''}`,
      description: `Reunião 1x1 agendada pela plataforma Gente Comunidade.${r.message ? `\n\nMensagem: ${r.message}` : ''}`,
      location: r.location || '',
      start: r.proposed_start,
      durationMinutes: r.duration_minutes,
    };

    return (
      <div key={r.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 hover:bg-muted/40 transition-colors">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={other?.avatar_url || ''} />
            <AvatarFallback>{initials(other?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-wrap-anywhere">{other?.full_name || 'Membro'}</p>
              {statusBadge(r.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(startDate, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })} · {r.duration_minutes} min
            </p>
            {r.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {r.location}</p>
            )}
            {r.message && (
              <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1"><MessageSquare className="h-3 w-3 mt-0.5" /> <span className="text-wrap-anywhere">{r.message}</span></p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {viewerRole === 'recipient' && r.status === 'pending' && (
            <>
              <Button size="sm" variant="outline" onClick={() => respond.mutate({ id: r.id, status: 'declined' })} disabled={respond.isPending}>
                <X className="h-4 w-4 mr-1" /> Recusar
              </Button>
              <Button size="sm" onClick={() => respond.mutate({ id: r.id, status: 'confirmed' })} disabled={respond.isPending}>
                <Check className="h-4 w-4 mr-1" /> Confirmar
              </Button>
            </>
          )}
          {viewerRole === 'requester' && r.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          )}
          {canCalendar && (
            <>
              <Button size="sm" variant="outline" onClick={() => downloadIcs(schedule, `gente-em-acao-${r.id}.ics`)}>
                <Download className="h-4 w-4 mr-1" /> .ics
              </Button>
              <Button size="sm" onClick={() => window.open(buildGoogleCalendarUrl(schedule), '_blank', 'noopener,noreferrer')}>
                <CalendarPlus className="h-4 w-4 mr-1" /> Google Calendar
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4 text-primary" /> Recebidas</CardTitle>
          <CardDescription>Solicitações de outros membros para agendar um Gente em Ação com você.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {received.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhuma solicitação recebida.</p>
            : received.map((r) => renderCard(r, 'recipient'))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4 text-primary" /> Enviadas</CardTitle>
          <CardDescription>Solicitações que você enviou. O convite de calendário aparece após a confirmação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sent.length === 0
            ? <p className="text-sm text-muted-foreground">Você ainda não enviou solicitações.</p>
            : sent.map((r) => renderCard(r, 'requester'))}
        </CardContent>
      </Card>
    </div>
  );
}
