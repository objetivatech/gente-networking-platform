/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { GuestMeetingRequest } from '../_shared/guest-meeting-rules.ts';
Deno.test('confirmação exige evento UUID e decisão booleana', () => {
  assertEquals(GuestMeetingRequest.safeParse({ action: 'confirm', meeting_id: 'invalid', confirm: true }).success, false);
  assertEquals(GuestMeetingRequest.safeParse({ action: 'confirm', meeting_id: '00000000-0000-4000-8000-000000000001', confirm: 'true' }).success, false);
  assertEquals(GuestMeetingRequest.safeParse({ action: 'confirm', meeting_id: '00000000-0000-4000-8000-000000000001', confirm: false }).success, true);
});
Deno.test('convite exige nome e e-mail válidos', () => {
  const body = { action: 'invite', meeting_id: '00000000-0000-4000-8000-000000000001', name: 'Pessoa Teste', email: 'pessoa@example.com' };
  assertEquals(GuestMeetingRequest.safeParse(body).success, true);
  assertEquals(GuestMeetingRequest.safeParse({ ...body, email: 'invalido' }).success, false);
  assertEquals(GuestMeetingRequest.safeParse({ ...body, name: '' }).success, false);
});
Deno.test('identidade do emissor não é aceita da entrada', () => {
  const parsed = GuestMeetingRequest.parse({ action: 'agenda', _caller: '00000000-0000-4000-8000-000000000001' });
  assertEquals('_caller' in parsed, false);
});