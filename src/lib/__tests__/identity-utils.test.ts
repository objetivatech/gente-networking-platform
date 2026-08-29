/**
 * Testes de regressão — convites, visibilidade de convidados, desativação e identidade única.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { describe, it, expect } from 'vitest';
import {
  buildDeactivateArgs,
  buildIdentityKeys,
  isSameIdentity,
  normalizePhoneKey,
  resolveGuestVisibility,
  resolveInviteCode,
} from '@/lib/identity-utils';

describe('identidade única (dedupe)', () => {
  it('normaliza telefone para os últimos 11 dígitos', () => {
    expect(normalizePhoneKey('+55 (51) 99999-8888')).toBe('51999998888');
    expect(normalizePhoneKey('5551999998888')).toBe('51999998888');
    expect(normalizePhoneKey('(51) 3216-5232')).toBe('5132165232');
  });

  it('ignora telefones curtos/inválidos', () => {
    expect(normalizePhoneKey('1234')).toBeNull();
    expect(normalizePhoneKey('')).toBeNull();
    expect(normalizePhoneKey(null)).toBeNull();
  });

  it('gera chaves de identidade normalizadas', () => {
    expect(buildIdentityKeys({ email: '  Joao@Teste.COM ', phone: '51 99999-8888' })).toEqual({
      email: 'joao@teste.com',
      phoneDigits: '51999998888',
    });
  });

  it('reconhece a mesma pessoa por e-mail OU telefone', () => {
    const a = { email: 'joao@empresa.com', phone: '+55 51 99999-8888' };
    expect(isSameIdentity(a, { email: 'JOAO@EMPRESA.COM', phone: null })).toBe(true);
    expect(isSameIdentity(a, { email: 'joao.pessoal@gmail.com', phone: '051999998888' })).toBe(true);
    expect(isSameIdentity(a, { email: 'outro@x.com', phone: '51 98888-7777' })).toBe(false);
  });
});

describe('atribuição de convite', () => {
  it('prioriza o código da URL sobre localStorage e metadata', () => {
    expect(
      resolveInviteCode({ urlCode: 'ABC', storedCode: 'DEF', metadataCode: 'GHI' }),
    ).toBe('ABC');
  });

  it('usa localStorage quando não há código na URL', () => {
    expect(resolveInviteCode({ urlCode: null, storedCode: 'DEF', metadataCode: 'GHI' })).toBe('DEF');
  });

  it('usa metadata como último recurso e ignora vazios', () => {
    expect(resolveInviteCode({ urlCode: '', storedCode: '   ', metadataCode: 'GHI' })).toBe('GHI');
    expect(resolveInviteCode({})).toBeNull();
  });
});

describe('visibilidade de encontros do convidado', () => {
  it('une grupos de todos os convites aceitos', () => {
    const res = resolveGuestVisibility([
      { id: '1', invited_by: 'u1', team_id: 't1', metadata: { allowed_team_ids: ['t9'] } },
      { id: '2', invited_by: 'u2', team_id: 't2', metadata: null },
    ]);
    expect(res.allowedTeamIds.sort()).toEqual(['t1', 't2', 't9']);
    expect(res.primary?.id).toBe('1');
    expect(res.inviterIds.sort()).toEqual(['u1', 'u2']);
  });

  it('inclui eventos HUB de convites sem grupo', () => {
    const res = resolveGuestVisibility([
      { id: '1', invited_by: 'u1', team_id: null, event_id: 'ev1', metadata: null },
    ]);
    expect(res.allowedTeamIds).toEqual([]);
    expect(res.eventIds).toEqual(['ev1']);
  });

  it('não quebra sem convites', () => {
    const res = resolveGuestVisibility(null);
    expect(res.primary).toBeNull();
    expect(res.allowedTeamIds).toEqual([]);
  });

  it('não duplica grupos repetidos entre convites', () => {
    const res = resolveGuestVisibility([
      { id: '1', invited_by: 'u1', team_id: 't1', metadata: { allowed_team_ids: ['t1'] } },
      { id: '2', invited_by: 'u1', team_id: 't1', metadata: null },
    ]);
    expect(res.allowedTeamIds).toEqual(['t1']);
  });
});

describe('desativação de convidados/membros', () => {
  it('monta os argumentos nomeados esperados pela RPC', () => {
    expect(buildDeactivateArgs('abc', 'Saiu do Gente')).toEqual({
      _member_id: 'abc',
      _reason: 'Saiu do Gente',
    });
  });

  it('envia motivo nulo quando vazio', () => {
    expect(buildDeactivateArgs('abc', '   ')).toEqual({ _member_id: 'abc', _reason: null });
    expect(buildDeactivateArgs('abc')).toEqual({ _member_id: 'abc', _reason: null });
  });
});
