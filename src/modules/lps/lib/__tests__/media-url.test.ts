/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { mediaStoragePath } from '../media-url';

describe('Entrega permanente da biblioteca de LPs', () => {
  it('preserva o caminho de arquivos antes privados sem gerar link temporário', () => {
    expect(mediaStoragePath('lps-media:import/original.png')).toBe('import/original.png');
  });
  it('preserva endereços públicos existentes', () => {
    expect(mediaStoragePath('https://example.com/logo.png')).toBeNull();
  });
  it('rejeita caminhos que escapam da pasta', () => {
    expect(() => mediaStoragePath('lps-media:../logo.png')).toThrow();
  });
});