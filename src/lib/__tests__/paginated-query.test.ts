/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { expect, it } from 'vitest';
import { fetchAllRows } from '../paginated-query';
it('Contadores incluem todas as 1201 pessoas sem truncamento', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id }));
  expect(await fetchAllRows(async (from, to) => ({ data: rows.slice(from, to + 1), error: null }))).toHaveLength(1201);
});