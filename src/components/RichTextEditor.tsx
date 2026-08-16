/**
 * @file RichTextEditor.tsx
 * @description Editor de texto rico leve (contenteditable) usado nos campos longos da
 * plataforma: negrito, itálico, sublinhado, listas, títulos simples e links.
 * O valor é sempre HTML sanitizado. Aceita valores legados em texto puro.
 * @copyright Ranktop / Gente Networking
 */
import { useEffect, useRef, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Heading, Link2, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeRichText, toDisplayHtml, richTextToPlain } from '@/lib/rich-text';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: number;
  className?: string;
  id?: string;
}

const TOOLS = [
  { cmd: 'bold', icon: Bold, label: 'Negrito' },
  { cmd: 'italic', icon: Italic, label: 'Itálico' },
  { cmd: 'underline', icon: Underline, label: 'Sublinhado' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Lista' },
  { cmd: 'insertOrderedList', icon: ListOrdered, label: 'Lista numerada' },
] as const;

export default function RichTextEditor({
  value, onChange, placeholder, maxLength, minHeight = 120, className, id,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Sincroniza apenas quando o valor externo diverge (evita perder o cursor ao digitar)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = toDisplayHtml(value);
    if (el.innerHTML !== next && document.activeElement !== el) {
      el.innerHTML = next;
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    onChange(sanitizeRichText(el.innerHTML));
  }, [onChange]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Endereço do link (https://...)');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert('Use um endereço iniciado por http:// ou https://');
      return;
    }
    exec('createLink', url);
  };

  const plainLength = richTextToPlain(value).length;
  const isEmpty = plainLength === 0;

  return (
    <div className={cn('rounded-md border bg-background min-w-0', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1">
        {TOOLS.map(({ cmd, icon: Icon, label }) => (
          <Button
            key={cmd}
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(cmd)}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          title="Título" aria-label="Título"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('formatBlock', '<h3>')}
        >
          <Heading className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          title="Inserir link" aria-label="Inserir link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          title="Limpar formatação" aria-label="Limpar formatação"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('removeFormat')}
        >
          <Eraser className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative">
        {isEmpty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          id={id}
          ref={ref}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          data-rd-no-capture="true"
          onInput={emit}
          onBlur={emit}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            emit();
          }}
          style={{ minHeight }}
          className="prose prose-sm max-w-none px-3 py-2 text-sm outline-none text-wrap-anywhere [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline"
        />
      </div>

      {maxLength && (
        <div className={cn('px-3 pb-1 text-right text-xs', plainLength > maxLength ? 'text-destructive' : 'text-muted-foreground')}>
          {plainLength}/{maxLength}
        </div>
      )}
    </div>
  );
}
