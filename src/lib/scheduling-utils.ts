/**
 * scheduling-utils - Utilitários para agendamento de reuniões 1x1 (Agenda 1x1).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Gera links de Google Calendar e arquivos .ics (sem dependência externa)
 * para agendar um "Gente em Ação" (reunião 1x1) com outro membro. Não faz
 * integração OAuth — apenas produz o convite de calendário no dispositivo do
 * usuário, mantendo o fluxo simples e sem configuração externa.
 */

export interface MeetingSchedule {
  title: string;
  description?: string;
  location?: string;
  /** Data/hora de início no formato ISO local (ex.: "2026-07-08T14:00"). */
  start: string;
  /** Duração em minutos. */
  durationMinutes?: number;
}

/** Converte data local (Date) para o formato UTC compacto usado em calendários: 20260708T170000Z */
function toCalendarUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function resolveWindow(schedule: MeetingSchedule): { start: Date; end: Date } {
  const start = new Date(schedule.start);
  const end = new Date(start.getTime() + (schedule.durationMinutes ?? 60) * 60 * 1000);
  return { start, end };
}

/** Monta a URL do Google Calendar (abre "novo evento" já preenchido). */
export function buildGoogleCalendarUrl(schedule: MeetingSchedule): string {
  const { start, end } = resolveWindow(schedule);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: schedule.title,
    dates: `${toCalendarUTC(start)}/${toCalendarUTC(end)}`,
  });
  if (schedule.description) params.set('details', schedule.description);
  if (schedule.location) params.set('location', schedule.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Gera o conteúdo de um arquivo .ics (compatível com Apple/Outlook/Google). */
export function buildIcsContent(schedule: MeetingSchedule): string {
  const { start, end } = resolveWindow(schedule);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@gentenetworking`;
  const escape = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gente Networking//Agenda 1x1//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toCalendarUTC(new Date())}`,
    `DTSTART:${toCalendarUTC(start)}`,
    `DTEND:${toCalendarUTC(end)}`,
    `SUMMARY:${escape(schedule.title)}`,
    schedule.description ? `DESCRIPTION:${escape(schedule.description)}` : '',
    schedule.location ? `LOCATION:${escape(schedule.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/** Dispara o download de um arquivo .ics no navegador. */
export function downloadIcs(schedule: MeetingSchedule, fileName = 'reuniao-1x1.ics'): void {
  const blob = new Blob([buildIcsContent(schedule)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
