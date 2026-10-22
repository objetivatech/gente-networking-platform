/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';
import { handleSmoothScroll } from '@/modules/lps/lib/scroll';

interface BannerBlockProps {
  block: PageBlock;
}

export function BannerBlock({ block }: BannerBlockProps) {
  const content = (
    <div 
      className="w-full h-64 md:h-96 bg-cover bg-center flex items-center justify-center"
      role="img"
      aria-label={block.title || 'Banner'}
      style={{ 
        backgroundImage: block.image_url ? `url(${block.image_url})` : undefined,
        backgroundColor: block.background_color || '#f3f4f6'
      }}
    >
      {block.title && (
        <div className="text-center px-4">
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{
              color: block.title_color || block.text_color || 'hsl(var(--primary-foreground))',
              fontSize: block.title_font_size || undefined
            }}
          >
            {block.title}
          </h2>
          {block.subtitle && (
            <p
              className="text-lg mt-2"
              style={{
                color: block.subtitle_color || block.text_color || 'hsl(var(--primary-foreground))',
                fontSize: block.subtitle_font_size || undefined
              }}
            >
              {block.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (block.button_link) {
    return (
      <a
        href={block.button_link}
        onClick={(e) => handleSmoothScroll(e, block.button_link || '')}
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
}
