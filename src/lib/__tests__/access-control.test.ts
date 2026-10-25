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
  canUseMatchmaking,
  canUseOpportunityBoard,
  canUseReferralRequests,
  canManageRescue,
  canAccessCommunityShowcase,
} from '../access-control';

describe('access-control: Fase 3 (Oportunidades e Pedidos de Indicação)', () => {
  it('membros/facilitadores/admins acessam', () => {
    for (const r of ['admin', 'facilitador', 'membro'] as const) {
      expect(canUseOpportunityBoard(r)).toBe(true);
      expect(canUseReferralRequests(r)).toBe(true);
    }
  });
  it('convidado NÃO acessa', () => {
    expect(canUseOpportunityBoard('convidado')).toBe(false);
    expect(canUseReferralRequests('convidado')).toBe(false);
  });
  it('role nula NÃO acessa', () => {
    expect(canUseOpportunityBoard(null)).toBe(false);
    expect(canUseReferralRequests(undefined)).toBe(false);
  });
});

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

describe('access-control: downgrade de membro para convidado', () => {
  it('apenas admin pode rebaixar', () => {
    expect(canDowngradeMember('admin')).toBe(true);
    expect(canDowngradeMember('facilitador')).toBe(false);
    expect(canDowngradeMember('membro')).toBe(false);
    expect(canDowngradeMember('convidado')).toBe(false);
    expect(canDowngradeMember(null)).toBe(false);
    expect(canDowngradeMember(undefined)).toBe(false);
  });
});

describe('access-control: MatchMaking', () => {
  it('admin/facilitador/membro podem usar', () => {
    expect(canUseMatchmaking('admin')).toBe(true);
    expect(canUseMatchmaking('facilitador')).toBe(true);
    expect(canUseMatchmaking('membro')).toBe(true);
  });
  it('convidado NÃO pode usar', () => expect(canUseMatchmaking('convidado')).toBe(false));
  it('role nula/indefinida NÃO pode usar', () => {
    expect(canUseMatchmaking(null)).toBe(false);
    expect(canUseMatchmaking(undefined)).toBe(false);
  });
});

describe('central de resgate (v3.43.0)', () => {
  it('somente admin gerencia a régua de resgate', () => {
    expect(canManageRescue('admin')).toBe(true);
    expect(canManageRescue('facilitador')).toBe(false);
    expect(canManageRescue('membro')).toBe(false);
    expect(canManageRescue('convidado')).toBe(false);
    expect(canManageRescue(null)).toBe(false);
  });
});

import { canAccessAppPath, isSubscriberRole } from '../access-control';

describe('access-control: Assinante da Comunidade (Bloco 2)', () => {
  it('Assinante não acessa áreas de Membros', () => {
    for (const p of ['/membros', '/convidados', '/encontros', '/conselho', '/estatisticas', '/ranking', '/convites', '/oportunidades', '/pedidos-indicacao', '/membro/joao', '/admin', '/dashboard', '/documentacao']) {
      expect(canAccessAppPath('assinante', p)).toBe(false);
    }
  });
  it('Assinante acessa Início, Vitrine, MatchMaking e movimentos permitidos', () => {
    for (const p of ['/', '/perfil', '/feed', '/vitrine', '/matchmaking', '/gente-em-acao', '/indicacoes', '/negocios', '/depoimentos', '/conteudos', '/configuracoes', '/perfil/']) {
      expect(canAccessAppPath('assinante', p)).toBe(true);
    }
  });
  it('demais papéis não são afetados', () => {
    for (const r of ['admin', 'facilitador', 'membro', 'convidado'] as const) {
      expect(canAccessAppPath(r, '/membros')).toBe(true);
      expect(isSubscriberRole(r)).toBe(false);
    }
  });
  it('Assinante usa MatchMaking com franquia, mas não Mural nem Pedidos', () => {
    expect(canUseMatchmaking('assinante')).toBe(true);
    expect(canUseOpportunityBoard('assinante')).toBe(false);
    expect(canUseReferralRequests('assinante')).toBe(false);
    expect(canViewMembersDirectory('assinante')).toBe(false);
    expect(canViewGuestsDirectory('assinante')).toBe(false);
  });
  it('Vitrine é exclusiva de Assinante e Convidado', () => {
    expect(canAccessCommunityShowcase('assinante')).toBe(true);
    expect(canAccessCommunityShowcase('convidado')).toBe(true);
    expect(canAccessCommunityShowcase('membro')).toBe(false);
    expect(canAccessCommunityShowcase('facilitador')).toBe(false);
    expect(canAccessCommunityShowcase('admin')).toBe(true);
    expect(canAccessCommunityShowcase(null)).toBe(false);
    expect(canAccessCommunityShowcase('membro', true)).toBe(true);
    expect(canAccessCommunityShowcase('facilitador', true)).toBe(true);
  });
});
