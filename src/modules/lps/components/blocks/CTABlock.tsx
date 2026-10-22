/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';
import { handleSmoothScroll } from '@/modules/lps/lib/scroll';

interface CTABlockProps {
  block: PageBlock;
  primaryColor?: string;
}

export function CTABlock({ block, primaryColor = 'hsl(var(--secondary))' }: CTABlockProps) {
  return (
    <section 
      className="py-16 px-4"
      style={{ backgroundColor: block.background_color || primaryColor }}
    >
      <div className="max-w-4xl mx-auto text-center">
        {block.title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{
              color: block.title_color || block.text_color || 'hsl(var(--primary-foreground))',
              fontSize: block.title_font_size || undefined
            }}
          >
            {block.title}
          </h2>
        )}
        {block.subtitle && (
          <p
            className="text-lg mb-8 opacity-90"
            style={{
              color: block.subtitle_color || block.text_color || 'hsl(var(--primary-foreground))',
              fontSize: block.subtitle_font_size || undefined
            }}
          >
            {block.subtitle}
          </p>
        )}
        {block.button_text && block.button_link && (
          <a
            href={block.button_link}
            onClick={(e) => handleSmoothScroll(e, block.button_link || '')}
            className="inline-block px-8 py-4 rounded-lg font-bold text-lg transition-transform hover:scale-105 shadow-lg bg-background"
            style={{ color: primaryColor }}
          >
            {block.button_text}
          </a>
        )}
      </div>
    </section>
  );
}
