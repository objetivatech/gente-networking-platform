/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { agendaAction } from '../guest-agenda';
describe('ações da agenda do convidado', () => {
  it('permite confirmar HUB ou Premium autorizado', () => expect(agendaAction({ is_attending: false, can_confirm: true })).toBe('confirm'));
  it('Premium sem convite oferece contato, nunca confirmação', () => expect(agendaAction({ is_attending: false, can_confirm: false })).toBe('contact'));
  it('HUB do Gente Conexões sem convite não permite confirmar', () => {
    const hub = { event_type: 'hub_event', is_attending: false, can_confirm: false };
    expect(agendaAction(hub)).toBe('contact');
  });
  it('uma confirmação existente permite cancelar mesmo sem outro convite', () => expect(agendaAction({ is_attending: true, can_confirm: false })).toBe('cancel'));
  it('confirmar um encontro não impede confirmar outro autorizado', () => {
    const meetings = [{ is_attending: true, can_confirm: true }, { is_attending: false, can_confirm: true }];
    expect(meetings.map(agendaAction)).toEqual(['cancel', 'confirm']);
  });
});