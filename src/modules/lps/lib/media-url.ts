/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
/** Converts legacy private pointers to permanent public paths without changing external URLs. */
export function mediaStoragePath(url: string): string | null {
  if (!url.startsWith('lps-media:')) return null;
  const path = url.slice('lps-media:'.length);
  if (!path || path.startsWith('/') || path.split('/').some(part => part === '..')) {
    throw new Error('Caminho de imagem inválido.');
  }
  return path;
}