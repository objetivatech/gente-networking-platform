import { describe, expect, it } from 'vitest';
import { normalizeDrawState, resolveMatchmakingDraws } from '../matchmaking-draw';

const suggestions = [{ id: 'weekly' }, { id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('franquia do MatchMaking', () => {
  it('sugestão semanal não entra na lista de sorteados nem consome franquia', () => {
    const result = resolveMatchmakingDraws(suggestions, 'weekly', [], false);
    expect(result.visible).toEqual([]);
    expect(result.nextCandidate?.id).toBe('a');
  });

  it('mostra apenas contatos efetivamente sorteados e aponta o próximo não repetido', () => {
    const result = resolveMatchmakingDraws(suggestions, 'weekly', ['a'], false);
    expect(result.visible.map((s) => s.id)).toEqual(['a']);
    expect(result.nextCandidate?.id).toBe('b');
  });

  it('modo administrativo preserva a listagem completa', () => {
    const result = resolveMatchmakingDraws(suggestions, 'weekly', ['a'], true);
    expect(result.visible).toHaveLength(4);
    expect(result.nextCandidate).toBeNull();
  });

  it('normaliza o estado da franquia com consumo e renovação', () => {
    const state = normalizeDrawState({ year_month: '2026-10', renewal_date: '2026-11-01', quota: 3, used: 2, remaining: 1, metered: true, can_draw: true, target_ids: ['a'] });
    expect(state?.remaining).toBe(1);
    expect(state?.target_ids).toEqual(['a']);
  });
});
