/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicProfileInviteDialog from '../public/PublicProfileInviteDialog';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
beforeEach(() => { cleanup(); vi.clearAllMocks(); });
const group = { id: '11111111-1111-4111-8111-111111111111', name: 'Grupo Teste' };
async function fill() {
  await screen.findByLabelText('Nome completo');
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Pessoa Teste' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'teste@example.com' } });
  fireEvent.change(screen.getByLabelText('WhatsApp com DDD'), { target: { value: '51999999999' } });
}
describe('Aquisição pública pelo endpoint central', () => {
  it('envia somente slug, grupo e identidade após consentimento explícito', async () => {
    invoke.mockResolvedValueOnce({ data: { groups: [group] }, error: null }).mockResolvedValueOnce({ data: { ok: true, delivery: { activation: 'sent' } }, error: null });
    render(<MemoryRouter><PublicProfileInviteDialog slug="membro-teste" hostName="Anfitrião" open onOpenChange={vi.fn()} /></MemoryRouter>);
    await fill();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByLabelText('Nome completo').closest('form') as HTMLFormElement);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls[1]).toEqual(['submit-lead', { body: { action: 'public_profile_invitation', profile_slug: 'membro-teste', target_team_id: group.id, name: 'Pessoa Teste', email: 'teste@example.com', phone: '(51) 99999-9999', company: '', consent: true } }]);
    expect(invoke.mock.calls[1]?.[1].body).not.toHaveProperty('invited_by');
  });
  it('não envia aquisição antes do consentimento', async () => {
    invoke.mockResolvedValueOnce({ data: { groups: [group] }, error: null });
    render(<MemoryRouter><PublicProfileInviteDialog slug="membro-teste" hostName="Anfitrião" open onOpenChange={vi.fn()} /></MemoryRouter>);
    await fill();
    fireEvent.submit(screen.getByLabelText('Nome completo').closest('form') as HTMLFormElement);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});