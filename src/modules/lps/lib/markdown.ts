/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import DOMPurify from 'dompurify';
/**
 * Simple Markdown to HTML parser for landing page content.
 * 
 * Supported syntax:
 * - **text** → <strong>text</strong> (bold)
 * - *text* or _text_ → <em>text</em> (italic)
 * - 

 → <br/><br/> (paragraph break)
 * - 
 → <br/> (line break)
 * 
 * Usage in admin panel:
 * - Use **double asterisks** for bold text
 * - Use *single asterisks* or _underscores_ for italic
 * - Use blank lines to separate paragraphs
 * - Emojis are rendered directly (🎯, 📈, etc.)
 */
export function parseMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  
  let html = text;
  
  // Escape HTML special characters (security)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Bold: **text** → <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ → <em>text</em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Paragraph breaks: double newlines
  html = html.replace(/\n\n/g, '</p><p>');
  
  // Line breaks: single newlines
  html = html.replace(/\n/g, '<br/>');
  
  // Wrap in paragraph tag
  html = `<p>${html}</p>`;
  
  return html;
}

/**
 * Check if content appears to be HTML (already formatted)
 */
export function isHtml(text: string | null | undefined): boolean {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Smart content renderer - detects if content is HTML or Markdown
 * and renders appropriately
 */
export function renderContent(text: string | null | undefined): string {
  if (!text) return '';
  
  // If already HTML, return as-is (for backward compatibility)
  if (isHtml(text)) {
    return DOMPurify.sanitize(text, { USE_PROFILES: { html: true } });
  }
  
  // Otherwise, parse as Markdown
  return DOMPurify.sanitize(parseMarkdown(text), { USE_PROFILES: { html: true } });
}

