/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { expect, it } from 'vitest';
import { entryContent } from '../entry-content';
it('entrada avançada não admite cadastro aberto', () => {
  const result = entryContent({ form: { title: 'Cadastro' }, hero: { title: 'Editado' } });
  expect(result.form).toBeUndefined();
  expect(result.hero?.title).toBe('Editado');
});