/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GuestAgenda } from '../guests/GuestAgenda';
const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks/useGuestAgenda', () => ({ useGuestAgenda: () => ({
  isLoading: false, isError: false,
  confirmation: { mutate, isPending: false },
  data: [
    { id: 'hub', title: 'HUB', event_type: 'hub_event', meeting_date: '2026-11-20', can_confirm: true, is_attending: false },
    { id: 'premium', title: 'Premium', event_type: 'premium_group', meeting_date: '2026-11-20', can_confirm: false, is_attending: false },
    { id: 'confirmed', title: 'Confirmado', event_type: 'premium_group', meeting_date: '2026-11-20', can_confirm: true, is_attending: true },
  ],
}) }));
afterEach(() => { cleanup(); mutate.mockClear(); });
describe('confirmação independente na agenda', () => {
  it('HUB aberto envia sua confirmação mesmo havendo outro encontro confirmado', () => {
    render(<GuestAgenda />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Presença no Gente HUB' }));
    expect(mutate).toHaveBeenCalledWith({ meetingId: 'hub', confirm: true });
  });
  it('cancelamento é direcionado somente ao encontro escolhido', () => {
    render(<GuestAgenda />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar Presença' }));
    expect(mutate).toHaveBeenCalledWith({ meetingId: 'confirmed', confirm: false });
  });
});