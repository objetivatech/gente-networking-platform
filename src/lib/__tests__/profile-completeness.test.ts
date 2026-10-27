/** @copyright Ranktop / Gente Networking */
import { describe, it, expect } from 'vitest';
import { getCompletenessLevel, getProfileCompletenessPercent, sortByCompletenessAndCompatibility } from '../profile-completeness';

const full = { avatar_url: 'a', full_name: 'b', company: 'c', position: 'd', business_segment: 'e', bio: 'f', what_i_do: 'g', ideal_client: 'h', how_to_refer_me: 'i' };

describe('completude do perfil', () => {
  it('perfil completo = 100%', () => expect(getProfileCompletenessPercent(full)).toBe(100));
  it('limpar um campo derruba abaixo de 100% (tarja volta)', () => expect(getProfileCompletenessPercent({ ...full, bio: '  ' })).toBe(89));
  it('níveis', () => {
    expect(getCompletenessLevel(100)).toBe('complete');
    expect(getCompletenessLevel(78)).toBe('almost');
    expect(getCompletenessLevel(69)).toBe('incomplete');
  });
  it('ordena por completude e depois compatibilidade', () => {
    const r = sortByCompletenessAndCompatibility([
      { full_name: 'A', percent: 50, compatibility: 9 },
      { full_name: 'B', percent: 100, compatibility: 1 },
      { full_name: 'C', percent: 100, compatibility: 5 },
    ]);
    expect(r.map((x) => x.full_name)).toEqual(['C', 'B', 'A']);
  });
});
