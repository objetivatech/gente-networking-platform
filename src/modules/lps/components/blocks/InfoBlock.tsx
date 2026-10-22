/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';
import { renderContent } from '@/modules/lps/lib/markdown';
import { handleSmoothScroll } from '@/modules/lps/lib/scroll';

interface InfoBlockProps {
  block: PageBlock;
  primaryColor?: string;
}

export function InfoBlock({ block, primaryColor = 'hsl(var(--secondary))' }: InfoBlockProps) {
  return (
    <section 
      className="py-16 px-4"
      style={{ backgroundColor: block.background_color || 'hsl(var(--primary-foreground))' }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {block.image_url && (
            <div className="w-full md:w-1/2">
              <img 
                src={block.image_url} 
                alt={block.title || 'Imagem informativa'} 
                loading="lazy"
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          )}
          <div className={`w-full ${block.image_url ? 'md:w-1/2' : ''} text-center md:text-left`}>
            {block.title && (
              <h2
                className="text-3xl font-bold mb-4"
                style={{
                  color: block.title_color || block.text_color || primaryColor,
                  fontSize: block.title_font_size || block.font_size || undefined
                }}
              >
                {block.title}
              </h2>
            )}
            {block.subtitle && (
              <p
                className="text-lg mb-4"
                style={{
                  color: block.subtitle_color || block.text_color || '#6B7280',
                  fontSize: block.subtitle_font_size || (block.font_size ? `calc(${block.font_size} * 0.7)` : undefined)
                }}
              >
                {block.subtitle}
              </p>
            )}
            {block.content && (
              <div
                className="prose prose-lg max-w-none [&_p]:mb-4 [&_strong]:font-bold [&_em]:italic"
                style={{
                  color: block.content_color || block.text_color || 'inherit',
                  fontSize: block.content_font_size || (block.font_size ? `calc(${block.font_size} * 0.85)` : undefined)
                }}
                dangerouslySetInnerHTML={{ __html: renderContent(block.content) }}
              />
            )}
            {block.button_text && block.button_link && (
              <a
                href={block.button_link}
                onClick={(e) => handleSmoothScroll(e, block.button_link || '')}
                className="inline-block mt-6 px-6 py-3 rounded-lg text-primary-foreground font-bold transition-transform hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                {block.button_text}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
