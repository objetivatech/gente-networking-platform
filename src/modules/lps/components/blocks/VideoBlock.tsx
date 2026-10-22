/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';

interface VideoBlockProps {
  block: PageBlock;
}

export function VideoBlock({ block }: VideoBlockProps) {
  const videoUrl = (block.settings as { video_url?: string })?.video_url || block.button_link;
  
  // Convert YouTube URL to embed URL
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <section 
      className="py-16 px-4"
      style={{ backgroundColor: block.background_color || 'hsl(var(--primary))' }}
    >
      <div className="max-w-4xl mx-auto">
        {block.title && (
          <h2 
            className="text-3xl font-bold mb-8 text-center"
            style={{ color: block.text_color || 'hsl(var(--primary-foreground))' }}
          >
            {block.title}
          </h2>
        )}
        {videoUrl && (
          <div className="aspect-video rounded-lg overflow-hidden shadow-xl">
            <iframe
              src={getEmbedUrl(videoUrl)}
              className="w-full h-full"
              title={block.title || 'Vídeo'}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {block.subtitle && (
          <p 
            className="text-lg mt-6 text-center opacity-90"
            style={{ color: block.text_color || 'hsl(var(--primary-foreground))' }}
          >
            {block.subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
