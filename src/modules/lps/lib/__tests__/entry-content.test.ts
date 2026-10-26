/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { expect, it } from 'vitest';
import { entryContent, SUBSCRIBER_DEFAULTS } from '../entry-content';
it('entrada avançada não admite cadastro aberto', () => {
  const result = entryContent({ form: { title: 'Cadastro' }, hero: { title: 'Editado' } });
  expect(result.form).toBeUndefined();
  expect(result.hero?.title).toBe('Editado');
});
it('apresentação de Assinantes preserva conteúdo editado sem injetar formulário', () => {
  const result = entryContent({ form: { title: 'Cadastro aberto' }, hero: { title: 'Título editado' } }, SUBSCRIBER_DEFAULTS);
  expect(result.form).toBeUndefined();
  expect(result.hero?.title).toBe('Título editado');
});