/**
 * Testes de regressão para a matriz central de permissões.
 *
 * Estes testes existem para impedir que mudanças futuras quebrem acessos
 * críticos por engano (ex.: membros perderem visibilidade dos convidados).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 */
import { describe, it, expect } from 'vitest';
import {
  canViewGuestsDirectory,
  canManageGuests,
  canViewMembersDirectory,
  canAccessAdminArea,
  isAdminOnly,
  canDowngradeMember,
} from '../access-control';

describe('access-control: diretório de convidados (/convidados)', () => {
  it('admin pode ver', () => expect(canViewGuestsDirectory('admin')).toBe(true));
  it('facilitador pode ver', () => expect(canViewGuestsDirectory('facilitador')).toBe(true));
  it('membro pode ver', () => expect(canViewGuestsDirectory('membro')).toBe(true));
  it('convidado NÃO pode ver', () => expect(canViewGuestsDirectory('convidado')).toBe(false));
  it('role nula NÃO pode ver', () => expect(canViewGuestsDirectory(null)).toBe(false));
  it('role indefinida NÃO pode ver', () => expect(canViewGuestsDirectory(undefined)).toBe(false));
});

describe('access-control: gestão de convidados', () => {
  it('admin pode gerenciar', () => expect(canManageGuests('admin')).toBe(true));
  it('facilitador pode gerenciar', () => expect(canManageGuests('facilitador')).toBe(true));
  it('membro NÃO pode gerenciar', () => expect(canManageGuests('membro')).toBe(false));
  it('convidado NÃO pode gerenciar', () => expect(canManageGuests('convidado')).toBe(false));
});

describe('access-control: diretório de membros (/membros)', () => {
  it('admin/facilitador/membro veem', () => {
    expect(canViewMembersDirectory('admin')).toBe(true);
    expect(canViewMembersDirectory('facilitador')).toBe(true);
    expect(canViewMembersDirectory('membro')).toBe(true);
  });
  it('convidado NÃO vê', () => expect(canViewMembersDirectory('convidado')).toBe(false));
});

describe('access-control: áreas administrativas', () => {
  it('admin acessa', () => expect(canAccessAdminArea('admin')).toBe(true));
  it('facilitador acessa', () => expect(canAccessAdminArea('facilitador')).toBe(true));
  it('membro NÃO acessa', () => expect(canAccessAdminArea('membro')).toBe(false));
  it('convidado NÃO acessa', () => expect(canAccessAdminArea('convidado')).toBe(false));

  it('isAdminOnly só passa para admin', () => {
    expect(isAdminOnly('admin')).toBe(true);
    expect(isAdminOnly('facilitador')).toBe(false);
    expect(isAdminOnly('membro')).toBe(false);
    expect(isAdminOnly('convidado')).toBe(false);
    expect(isAdminOnly(null)).toBe(false);
  });
});
