/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
interface ClaimClient {
  rpc(name: string, args: Record<string, string>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from(name: string): { update(value: Record<string, string>): { eq(key: string, value: string): { eq(key: string, value: string): PromiseLike<unknown> } } };
}
export async function claimedDispatch(db: ClaimClient, context: string, referenceId: string, action: () => Promise<boolean>): Promise<string> {
  const { data: claimed, error } = await db.rpc('claim_community_message', { _context: context, _reference_id: referenceId });
  if (error) { console.error('[lp-dispatch] claim failed', context, error.message); return 'error'; }
  if (!claimed) return 'already_processed';
  let ok = false;
  try { ok = await action(); } catch { console.error('[lp-dispatch] provider exception', context); }
  await db.from('community_message_claims').update({ state: ok ? 'sent' : 'failed', updated_at: new Date().toISOString() }).eq('context', context).eq('reference_id', referenceId);
  return ok ? 'sent' : 'error';
}