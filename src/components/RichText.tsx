/**
 * @file RichText.tsx
 * @description Renderiza conteúdo rico (HTML sanitizado) ou texto puro legado com a
 * tipografia da plataforma. Usado na plataforma e na página pública do membro.
 * @copyright Ranktop / Gente Networking
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { toDisplayHtml, isRichTextEmpty } from '@/lib/rich-text';

interface RichTextProps {
  value: string | null | undefined;
  className?: string;
  /** Limita a exibição a N linhas (line-clamp). */
  clamp?: number;
}

export default function RichText({ value, className, clamp }: RichTextProps) {
  const html = useMemo(() => toDisplayHtml(value), [value]);
  if (isRichTextEmpty(value)) return null;

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-wrap-anywhere',
        'prose-p:my-1 prose-headings:my-2 prose-headings:text-base prose-headings:font-semibold',
        '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5',
        '[&_a]:text-primary [&_a]:underline',
        clamp ? `line-clamp-${clamp}` : '',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
