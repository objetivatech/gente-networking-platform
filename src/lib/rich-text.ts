/**
 * @file rich-text.ts
 * @description Utilitários de texto rico da plataforma. O conteúdo é gravado como
 * HTML sanitizado (sem markdown e sem JSON). Textos antigos em texto puro continuam
 * funcionando: são detectados e convertidos para parágrafos na exibição.
 * @copyright Ranktop / Gente Networking
 */
import DOMPurify from 'dompurify';

/** Tags permitidas no editor rico (formatação simples). */
export const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'a', 'span', 'div',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

/** Sanitiza HTML vindo do editor ou do banco antes de gravar/exibir. */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: ['style', 'class', 'onerror', 'onclick'],
  });
  return clean.trim();
}

/** Indica se o valor guardado já é HTML (conteúdo novo) ou texto puro (legado). */
export function isHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?(p|br|strong|b|em|i|u|s|ul|ol|li|h3|h4|blockquote|a|span|div)\b[^>]*>/i.test(value);
}

/** Escapa caracteres especiais de texto puro. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converte qualquer valor armazenado (HTML novo ou texto puro legado) em HTML
 * seguro pronto para exibição.
 */
export function toDisplayHtml(value: string | null | undefined): string {
  if (!value) return '';
  if (isHtml(value)) return sanitizeRichText(value);
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/** Converte conteúdo rico em texto puro (para e-mails simples, resumos e SEO). */
export function richTextToPlain(value: string | null | undefined): string {
  if (!value) return '';
  if (!isHtml(value)) return value.trim();
  const withBreaks = value
    .replace(/<\/(p|div|li|h3|h4|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const stripped = DOMPurify.sanitize(withBreaks, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return stripped.replace(/\n{3,}/g, '\n\n').trim();
}

/** Verifica se o conteúdo rico está efetivamente vazio. */
export function isRichTextEmpty(value: string | null | undefined): boolean {
  return richTextToPlain(value).length === 0;
}
