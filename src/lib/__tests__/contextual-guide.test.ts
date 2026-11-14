/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { expect, it } from 'vitest';
import { canAutoStartGuide, getContextualGuide } from '../contextual-guide';
it('vídeo pendente impede início automático', () => { expect(canAutoStartGuide(true, true, false, false)).toBe(false); });
it('perfil incompleto impede início automático', () => { expect(canAutoStartGuide(false, false, false, false)).toBe(false); });
it('outro diálogo impede início automático', () => { expect(canAutoStartGuide(false, true, true, false)).toBe(false); });
it('guia já visto não inicia novamente', () => { expect(canAutoStartGuide(false, true, false, true)).toBe(false); });
it('guia novo inicia sem bloqueios', () => { expect(canAutoStartGuide(false, true, false, false)).toBe(true); });
it('cada papel recebe escopo próprio em todas as páginas', () => { expect(getContextualGuide('/perfil', 'assinante')[2]).not.toEqual(getContextualGuide('/perfil', 'membro')[2]); });