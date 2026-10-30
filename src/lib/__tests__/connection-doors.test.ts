/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, it, expect } from 'vitest';
import { analyzeDoorBridge, compactDoorLabels, doorLabels, type ConnectionTaxonomy } from '../connection-doors';
import { analyzeMatchOpportunity } from '../matchmaking-rules';
import { getCompatibilityScore, getProfileCompletenessPercent, sortByCompletenessAndCompatibility } from '../profile-completeness';
const options: ConnectionTaxonomy[] = [
  { id: 'ceo', type: 'decisor', label: 'CEOs', is_active: true, sort_order: 1 },
  { id: 'industry', type: 'setor', label: 'Indústria', is_active: true, sort_order: 1 },
  { id: 'old', type: 'setor', label: 'Antiga', is_active: false, sort_order: 2 },
];
describe('portas de conexão', () => {
  it('limita a dois selos e preserva todos os demais', () => expect(compactDoorLabels(['A','B','C','D','E'])).toEqual({ visible: ['A','B'], hidden: ['C','D','E'] }));
  it('desativação e renomeação preservam exibição por ID', () => expect(doorLabels(['old','ceo'], [{ ...options[0], label: 'Diretores' }, options[2]])).toEqual(['Diretores','Antiga']));
  it('procura cruza oferta na direção correta', () => expect(analyzeDoorBridge({ doors_seek: ['ceo','industry'] }, { doors_open: ['ceo','industry'] }, options)).toMatchObject({ direct: true, score: 70, forward: ['CEOs','Indústria'] }));
  it('duas ofertas não são uma ponte', () => expect(analyzeDoorBridge({ doors_open: ['ceo'] }, { doors_open: ['ceo'] }, options).score).toBe(0));
  it('reciprocidade acrescenta bônus sem multiplicar duplicatas', () => expect(analyzeDoorBridge({ doors_seek: ['ceo','industry','ceo'], doors_open: ['ceo','industry'] }, { doors_seek: ['ceo','industry'], doors_open: ['ceo','industry'] }, options).score).toBe(80));
  it('uma dimensão não afirma ponte direta', () => expect(analyzeDoorBridge({ doors_seek: ['ceo'] }, { doors_open: ['ceo'] }, options)).toMatchObject({ direct: false, score: 35 }));
  it('opções inativas e desconhecidas não pontuam', () => expect(analyzeDoorBridge({ doors_seek: ['old','unknown'] }, { doors_open: ['old','unknown'] }, options).score).toBe(0));
  it('ponte também funciona entre consultores do mesmo segmento', () => {
    const base = { what_i_do: 'Consultoria', ideal_client: '', business_segment: 'Consultoria', tags: [] };
    expect(analyzeMatchOpportunity({ ...base, doors_seek: ['ceo','industry'] }, { ...base, doors_open: ['ceo','industry'] }, { hasIdealClientFit: false, hasSameSegment: true, hasSharedTags: false, taxonomies: options })).toMatchObject({ matchType: 'ponte', partnershipScore: 70 });
  });
  it('os nove campos antigos sem portas agora totalizam 75%', () => expect(getProfileCompletenessPercent({ avatar_url:'a',full_name:'b',company:'c',position:'d',business_segment:'e',bio:'f',what_i_do:'g',ideal_client:'h',how_to_refer_me:'i' })).toBe(75));
  it('na Vitrine ponte melhora compatibilidade sem passar completude', () => {
    const compatibility = getCompatibilityScore({ doors_seek: ['ceo','industry'] }, { doors_open: ['ceo','industry'] }, options);
    expect(compatibility).toBe(70);
    expect(sortByCompletenessAndCompatibility([{ full_name: 'Ponte', percent: 89, compatibility }, { full_name: 'Completo', percent: 100, compatibility: 0 }]).map((p) => p.full_name)).toEqual(['Completo','Ponte']);
  });
});