/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { expect, it } from 'vitest';
import { canAutoStartGuide, getContextualGuide, needsProfilePrompt } from '../contextual-guide';
it('vídeo pendente impede início automático', () => { expect(canAutoStartGuide(true, true, false, false)).toBe(false); });
it('perfil incompleto impede início automático', () => { expect(canAutoStartGuide(false, false, false, false)).toBe(false); });
it('outro diálogo impede início automático', () => { expect(canAutoStartGuide(false, true, true, false)).toBe(false); });
it('guia já visto não inicia novamente', () => { expect(canAutoStartGuide(false, true, false, true)).toBe(false); });
it('guia novo inicia sem bloqueios', () => { expect(canAutoStartGuide(false, true, false, false)).toBe(true); });
it('cada papel recebe escopo próprio em todas as páginas', () => { expect(getContextualGuide('/perfil', 'assinante')[2]).not.toEqual(getContextualGuide('/perfil', 'membro')[2]); });
it('adiar perfil permite guia sem exigir completude', () => { expect(canAutoStartGuide(false, false, false, false, true)).toBe(true); });
it('vídeo continua prioritário após adiar perfil', () => { expect(canAutoStartGuide(true, false, false, false, true)).toBe(false); });
it('perfil completo nunca pede preenchimento', () => { expect(needsProfilePrompt(true, true, '', 'foto')).toBe(false); });
it('perfil pendente abre aviso após carregar', () => { expect(needsProfilePrompt(true, false, 'foto', '')).toBe(true); });
it('adiar vale para os mesmos campos na sessão', () => { expect(needsProfilePrompt(true, false, 'foto', 'foto')).toBe(false); });
it('nova pendência volta a pedir preenchimento', () => { expect(needsProfilePrompt(true, false, 'foto,bio', 'foto')).toBe(true); });
it('não abre antes de carregar os campos reais', () => { expect(needsProfilePrompt(false, false, 'foto', '')).toBe(false); });