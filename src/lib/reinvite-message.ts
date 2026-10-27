/**
 * Mensagem de reconvite e normalização de WhatsApp.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { formatDateBR } from '@/lib/date-utils';

export function toWhatsAppDigits(phone: string | null | undefined): string | null {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}

export function buildReinviteMessage(p: {
  guestName: string;
  teamName?: string | null;
  meetingDate: string;
  meetingTime?: string | null;
  location?: string | null;
}): string {
  const first = (p.guestName || '').trim().split(/\s+/)[0] || 'tudo bem';
  const group = p.teamName ? ` do Grupo ${p.teamName}` : '';
  const time = p.meetingTime ? ` às ${String(p.meetingTime).slice(0, 5)}` : '';
  const place = p.location ? ` em ${p.location}` : '';
  return `Olá ${first}! Tudo bem? Queremos muito você no próximo encontro${group}: dia ${formatDateBR(p.meetingDate)}${time}${place}. Posso confirmar sua presença?`;
}
