/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it, vi } from 'vitest';
import { claimedDispatch } from '../../../../../supabase/functions/_shared/lp-claim';
describe('Reservas independentes de envio LP', () => {
  function fakeDb(claimed: boolean, error: unknown = null) {
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn((_value: Record<string, string>) => ({ eq }));
    return { db: { rpc: vi.fn(async () => ({ data: claimed, error })), from: vi.fn(() => ({ update })) }, update };
  }
  it('não repete um envio já reservado/concluído', async () => {
    const { db } = fakeDb(false); const action = vi.fn(async () => true);
    expect(await claimedDispatch(db as never, 'lp_activation', 'invite-1', action)).toBe('already_processed');
    expect(action).not.toHaveBeenCalled();
  });
  it('só registra entregue quando o provedor confirma', async () => {
    const { db, update } = fakeDb(true);
    expect(await claimedDispatch(db as never, 'lp_activation', 'invite-1', async () => true)).toBe('sent');
    expect(update.mock.calls[0]?.[0]).toMatchObject({ state: 'sent' });
  });
  it('marca falha recuperável quando o provedor recusa', async () => {
    const { db, update } = fakeDb(true);
    expect(await claimedDispatch(db as never, 'lp_activation', 'invite-1', async () => false)).toBe('error');
    expect(update.mock.calls[0]?.[0]).toMatchObject({ state: 'failed' });
  });
  it('marca falha recuperável quando o provedor lança erro', async () => {
    const { db, update } = fakeDb(true);
    expect(await claimedDispatch(db as never, 'lp_rd_conversion', 'lead-1', async () => { throw new Error('timeout'); })).toBe('error');
    expect(update.mock.calls[0]?.[0]).toMatchObject({ state: 'failed' });
  });
});