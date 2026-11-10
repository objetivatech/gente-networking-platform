/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { normalizeLpForm, validateLpAnswers, hasConfiguredLpForm } from '../form-config';
import { canShowPlatformInstall } from '../install-visibility';
import { lpMetaTags } from '../../../../../functions/_shared/lp-meta';
describe('LPs após a virada', () => {
  it('mantém o formulário original quando a configuração está vazia', () => expect(hasConfiguredLpForm({})).toBe(false));
  it('valida campos obrigatórios visíveis', () => {
    const config = normalizeLpForm({ fields: { phone: { visible: true, required: true, label: 'WhatsApp' } } });
    expect(validateLpAnswers(config, { phone: '' }, {})).toBe('Preencha: WhatsApp');
    expect(validateLpAnswers(config, { phone: '51999999999' }, {})).toBeNull();
  });
  it('não exige campo que o Admin ocultou', () => expect(validateLpAnswers(normalizeLpForm({ fields: { company: { visible: false, required: true } } }), {}, {})).toBeNull());
  it('exige respostas customizadas e restringe opções', () => {
    const config = normalizeLpForm({ questions: [{ id: 'interesse', label: 'Interesse', type: 'select', required: true, options: ['Master', 'Impulso'] }] });
    expect(validateLpAnswers(config, {}, {})).toBe('Preencha: Interesse');
    expect(validateLpAnswers(config, {}, { interesse: 'Outro' })).toBe('Opção inválida: Interesse');
    expect(validateLpAnswers(config, {}, { interesse: 'Impulso' })).toBeNull();
  });
  it('não permite sobrescrever identidade com configuração de campo', () => {
    const config = normalizeLpForm({ fields: { name: { visible: false }, email: { required: false } } });
    expect(config.fields).toEqual({});
  });
  it('não oferece instalação em nenhuma LP, inclusive slugs futuros', () => {
    expect(canShowPlatformInstall('lps.gentenetworking.com.br', '/')).toBe(false);
    expect(canShowPlatformInstall('comunidade.gentenetworking.com.br', '/lps/22gentehub')).toBe(false);
    expect(canShowPlatformInstall('comunidade.gentenetworking.com.br', '/nova-campanha')).toBe(false);
    expect(canShowPlatformInstall('comunidade.gentenetworking.com.br', '/obrigado')).toBe(false);
    expect(canShowPlatformInstall('comunidade.gentenetworking.com.br', '/perfil')).toBe(true);
  });
  it('usa a imagem individual da LP e mantém domínio raiz canônico', () => {
    const html = lpMetaTags({ slug: 'participe', name: 'Participe', og_image_url: 'https://example.com/participe.jpg' });
    expect(html).toContain('content="https://example.com/participe.jpg"');
    expect(html).toContain('href="https://gentenetworking.com.br/participe"');
    expect(html).not.toContain('comunidade.gentenetworking.com.br');
  });
  it('não publica URL insegura ou HTML editorial ativo nos metadados', () => {
    const html = lpMetaTags({ slug: 'participe', name: '<script>x</script>', og_image_url: 'javascript:alert(1)' });
    expect(html).not.toContain('<script>'); expect(html).not.toContain('javascript:');
  });
});