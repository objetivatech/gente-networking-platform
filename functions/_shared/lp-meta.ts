/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export interface LpMeta { slug: string; name: string; meta_title?: string | null; meta_description?: string | null; og_image_url?: string | null; canonical_url?: string | null }
export function escapeMeta(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}
export function lpMetaTags(page: LpMeta): string {
  const title = escapeMeta(page.meta_title || page.name);
  const description = escapeMeta(page.meta_description || '');
  const canonical = escapeMeta(page.canonical_url && /^https:\/\//.test(page.canonical_url) ? page.canonical_url : `https://gentenetworking.com.br/${page.slug === 'inicio' ? '' : page.slug}`);
  const image = page.og_image_url && /^https:\/\//.test(page.og_image_url) ? escapeMeta(page.og_image_url) : null;
  return `<title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}">${image ? `<meta property="og:image" content="${image}"><meta name="twitter:image" content="${image}">` : ''}`;
}