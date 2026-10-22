/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';
import { handleSmoothScroll } from '@/modules/lps/lib/scroll';

interface HeroBlockProps {
  block: PageBlock;
  primaryColor?: string;
  logoUrl?: string;
  logoSize?: string;
  pageName?: string;
}

const logoSizeMap = {
  sm: 'h-12',
  md: 'h-16',
  lg: 'h-24',
  xl: 'h-32'
};

export function HeroBlock({ block, primaryColor = 'hsl(var(--secondary))', logoUrl, logoSize = 'md', pageName }: HeroBlockProps) {
  const bgStyle = block.image_url
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${block.image_url})` }
    : { backgroundColor: block.background_color || primaryColor };

  const logoHeightClass = logoSizeMap[logoSize as keyof typeof logoSizeMap] || logoSizeMap.md;

  return (
    <section
      className="min-h-[70vh] flex items-center justify-center bg-cover bg-center px-4"
      style={bgStyle}
      role="banner"
      aria-label={block.title || pageName || 'Seção principal'}
    >
      <div className="max-w-4xl mx-auto text-center">
        {logoUrl && (
          <div className="mb-8 flex justify-center">
            <img
              src={logoUrl}
              alt={`Logo ${pageName || 'Gente Networking'}`}
              className={`${logoHeightClass} w-auto object-contain`}
            />
          </div>
        )}
        <h1
          className="text-4xl md:text-6xl font-bold mb-6"
          style={{
            color: block.title_color || block.text_color || 'hsl(var(--primary-foreground))',
            fontSize: block.title_font_size || block.font_size || undefined
          }}
        >
          {block.title}
        </h1>
        {block.subtitle && (
          <p
            className="text-xl md:text-2xl mb-8 opacity-90"
            style={{
              color: block.subtitle_color || block.text_color || 'hsl(var(--primary-foreground))',
              fontSize: block.subtitle_font_size || (block.font_size ? `calc(${block.font_size} * 0.6)` : undefined)
            }}
          >
            {block.subtitle}
          </p>
        )}
        {block.button_text && block.button_link && (
          <a
            href={block.button_link}
            onClick={(e) => handleSmoothScroll(e, block.button_link || '')}
            className="inline-block px-8 py-4 rounded-lg text-primary-foreground font-bold text-lg transition-transform hover:scale-105 shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {block.button_text}
          </a>
        )}
      </div>
    </section>
  );
}
