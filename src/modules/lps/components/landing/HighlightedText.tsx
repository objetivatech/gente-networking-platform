/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import React from 'react';

/**
 * Renders text with simple inline markdown:
 *   **palavra**  → <span style={{color: primary}}>palavra</span>
 *   *itálico*    → <em>itálico</em>
 *   \n           → <br />
 *
 * Used for editable titles/subtitles on the GeNtE Comunidade advanced template.
 */
export function HText({
  children,
  color,
  as: Tag = 'span',
  className,
  style,
}: {
  children?: string | null;
  color: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!children) return null;
  const text = String(children);

  // First split by newlines, then within each line parse ** and *
  const lines = text.split(/\n/);
  const rendered: React.ReactNode[] = [];
  lines.forEach((line, li) => {
    if (li > 0) rendered.push(<br key={`br-${li}`} />);
    // Regex captures: **bold** or *italic*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    parts.forEach((part, pi) => {
      if (!part) return;
      const k = `${li}-${pi}`;
      if (part.startsWith('**') && part.endsWith('**')) {
        rendered.push(
          <span key={k} style={{ color }}>
            {part.slice(2, -2)}
          </span>,
        );
      } else if (part.startsWith('*') && part.endsWith('*')) {
        rendered.push(<em key={k}>{part.slice(1, -1)}</em>);
      } else {
        rendered.push(<React.Fragment key={k}>{part}</React.Fragment>);
      }
    });
  });

  return (
    <Tag className={className} style={style}>
      {rendered}
    </Tag>
  );
}
