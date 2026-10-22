/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, it, expect } from 'vitest';
import { canonicalForPage, fallbackSource, parseSubmission, validateSlug } from '../rules';
import { renderContent } from '../markdown';
describe('Regras da unificação', () => {
  it('mantém domínio raiz canônico para LPs', () => expect(canonicalForPage('impulso')).toBe('https://gentenetworking.com.br/impulso'));
  it('preserva entrada no domínio da plataforma', () => expect(canonicalForPage('entrada-plataforma')).toBe('https://comunidade.gentenetworking.com.br/auth'));
  it('não transforma Impulso em HUB', () => expect(fallbackSource('impulso')).toBe('lp_participe'));
  it('classifica HUB separadamente', () => expect(fallbackSource('gentehub')).toBe('lp_gentehub'));
  it('protege caminhos já usados pela plataforma', () => { expect(validateSlug('auth')).toBe(false); expect(validateSlug('encontros')).toBe(false); expect(validateSlug('nova-campanha')).toBe(true); });
  it('trata membro existente como fluxo concluído sem nova captação', () => expect(parseSubmission(409, { already_member: true }).status).toBe('already_member'));
  it('não declara sucesso quando CRM falha', () => expect(() => parseSubmission(500, { error: 'failure' })).toThrow());
  it('remove execução ativa de conteúdo editorial', () => { const result = renderContent('<p onclick="alert(1)">Texto</p><script>alert(1)</script>'); expect(result).not.toContain('onclick'); expect(result).not.toContain('<script'); expect(result).toContain('Texto'); });
});