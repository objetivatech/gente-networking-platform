/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { expect, it } from 'vitest';
import { connectionsContent } from '../connections-content';

it('apresentação Conexões exclui formulário de aquisição mesmo em conteúdo legado', () => {
  expect(connectionsContent({ form: { title: 'Não renderizar' } }).form).toBeUndefined();
});
it('não publica depoimentos fictícios como padrão', () => {
  expect(connectionsContent({}).testimonials?.testimonials).toEqual([]);
});
it('preserva remoção explícita de depoimentos reais', () => {
  expect(connectionsContent({ testimonials: { testimonials: [] } }).testimonials?.testimonials).toEqual([]);
});