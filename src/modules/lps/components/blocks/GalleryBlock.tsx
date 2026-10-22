/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';

interface GalleryBlockProps {
  block: PageBlock;
}

export function GalleryBlock({ block }: GalleryBlockProps) {
  const images = (block.settings as { images?: { url: string; alt?: string }[] })?.images || [];

  return (
    <section 
      className="py-16 px-4"
      style={{ backgroundColor: block.background_color || 'hsl(var(--primary-foreground))' }}
    >
      <div className="max-w-6xl mx-auto">
        {block.title && (
          <h2 
            className="text-3xl font-bold mb-12 text-center"
            style={{ color: block.text_color || '#1f2937' }}
          >
            {block.title}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div 
              key={index}
              className="aspect-square overflow-hidden rounded-lg"
            >
              <img 
                src={image.url} 
                alt={image.alt || `Imagem da galeria ${index + 1}`}
                loading="lazy"
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
