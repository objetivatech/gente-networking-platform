/**
 * Teste de regressão: o diretório de convidados precisa usar a RPC segura
 * `get_guests_directory`, e nunca voltar a ler `invitations` diretamente.
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

  it('chama a RPC get_guests_directory e mapeia o resultado', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: 'u1',
          full_name: 'Convidado Um',
          slug: 'convidado-um',
          email: 'c1@ex.com',
          phone: null,
          company: 'ACME',
          avatar_url: null,
          business_segment: null,
          role_current: 'convidado',
          status: 'awaiting_first',
          team_id: null,
          team_name: null,
          team_color: null,
          invited_by_id: null,
          invited_by_name: null,
          invited_at: null,
          attendance_count: 0,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useGuestsDirectory(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith('get_guests_directory');
    expect(result.current.data?.[0]).toMatchObject({
      id: 'u1',
      full_name: 'Convidado Um',
      current_role: 'convidado',
      status: 'awaiting_first',
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
