/**
 * Teste de regressão: o diretório de convidados precisa usar a RPC segura
 * `get_guest_journey_directory`, e nunca voltar a ler tabelas sensíveis diretamente.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
  supabaseReadOnly: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

import { useGuestsDirectory } from '../useGuestsDirectory';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
};

describe('useGuestsDirectory', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it('chama a RPC unificada e mapeia pré-ativação com origem', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: 'u1',
          lead_id: 'l1',
          profile_id: null,
          invitation_id: 'i1',
          full_name: 'Convidado Um',
          slug: 'convidado-um',
          email: 'c1@ex.com',
          phone: null,
          company: 'ACME',
          avatar_url: null,
          business_segment: null,
          role_current: 'convidado',
          journey_status: 'aguardando_ativacao',
          onboarding_category: 'impulso',
          source: 'lp_participe',
          source_detail: 'impulso',
          team_id: null,
          team_name: null,
          team_color: null,
          invited_by_id: null,
          invited_by_name: null,
          entered_at: '2026-09-16T10:00:00Z',
          invitation_status: 'pending',
          invitation_expires_at: '2026-10-16T10:00:00Z',
          email_status: 'sent',
          email_sent_at: '2026-09-16T10:00:01Z',
          attendance_count: 0,
          can_manage: true,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useGuestsDirectory(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith('get_guest_journey_directory');
    expect(result.current.data?.[0]).toMatchObject({
      id: 'u1',
      full_name: 'Convidado Um',
      current_role: 'convidado',
      status: 'aguardando_ativacao',
      onboarding_category: 'impulso',
    });
    // Regressão: não deve consultar `invitations` diretamente.
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('devolve lista vazia quando a RPC responde forbidden', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'forbidden' } });
    const { result } = renderHook(() => useGuestsDirectory(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
