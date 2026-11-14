/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export interface GuestAgendaMeeting {
  id: string;
  team_id: string | null;
  title: string;
  team_name: string | null;
  event_type: 'premium_group' | 'hub_event';
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  can_confirm: boolean;
  is_attending: boolean;
  invited_by_name: string | null;
  facilitators: { name: string; phone: string | null }[] | null;
}
export function agendaAction(meeting: Pick<GuestAgendaMeeting, 'is_attending' | 'can_confirm'>) {
  if (meeting.is_attending) return 'cancel';
  return meeting.can_confirm ? 'confirm' : 'contact';
}