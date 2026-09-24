/**
 * Utilitários do envio assistido por WhatsApp no agendamento do Gente em Ação.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

export const SCHEDULING_PUBLIC_URL = 'https://comunidade.gentenetworking.com.br/perfil?tab=agendamentos';

interface SchedulingWhatsAppMessageInput {
  recipientName: string;
  requesterName: string;
  proposedStart: string;
  durationMinutes: number;
  location?: string | null;
}

/** Normaliza telefones brasileiros para DDI 55 e rejeita formatos incompatíveis. */
export function normalizeBrazilianWhatsAppPhone(phone?: string | null): string | null {
  const raw = (phone || '').trim();
  if (/^\+(?!55)/.test(raw) || /^00(?!55)/.test(raw)) return null;

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);

  if (!/^\d{10,11}$/.test(digits)) return null;
  return `55${digits}`;
}

export function buildSchedulingWhatsAppMessage(input: SchedulingWhatsAppMessageInput): string {
  const date = new Date(input.proposedStart);
  const dateText = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
  const timeText = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
  const durationText = input.durationMinutes === 60
    ? '1 hora'
    : input.durationMinutes === 90
      ? '1h30'
      : `${input.durationMinutes} minutos`;
  const locationText = input.location?.trim() || 'A combinar';

  return `Olá, ${input.recipientName}! Tudo bem? Sou ${input.requesterName}, da Comunidade Gente Networking. Enviei uma solicitação de Gente em Ação para conversarmos no dia ${dateText}, às ${timeText}, com duração prevista de ${durationText}. Local: ${locationText}. Você pode confirmar ou recusar o agendamento pela plataforma: ${SCHEDULING_PUBLIC_URL}. Até lá!`;
}

export function buildSchedulingWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
