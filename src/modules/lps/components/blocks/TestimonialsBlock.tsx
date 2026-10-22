/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';

interface Testimonial {
  name: string;
  role?: string;
  image?: string;
  text: string;
}

interface TestimonialsBlockProps {
  block: PageBlock;
  primaryColor?: string;
}

export function TestimonialsBlock({ block, primaryColor = 'hsl(var(--secondary))' }: TestimonialsBlockProps) {
  // Try to get testimonials from settings or parse from content
  let testimonials: Testimonial[] = (block.settings as { testimonials?: Testimonial[] })?.testimonials || [];
  
  // If testimonials empty but content exists, try parsing content as JSON array
  if (testimonials.length === 0 && block.content) {
    try {
      const parsed = JSON.parse(block.content);
      if (Array.isArray(parsed)) {
        testimonials = parsed;
      }
    } catch {
      // Content is not JSON, ignore
    }
  }

  return (
    <section 
      className="py-16 px-4"
      style={{ backgroundColor: block.background_color || '#f9fafb' }}
    >
      <div className="max-w-6xl mx-auto">
        {block.title && (
          <h2 
            className="text-3xl font-bold mb-12 text-center"
            style={{ color: block.text_color || primaryColor }}
          >
            {block.title}
          </h2>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-background rounded-lg shadow-lg p-6"
            >
              <div className="flex items-center mb-4">
                {testimonial.image ? (
                  <img 
                    src={testimonial.image} 
                    alt={`Foto de ${testimonial.name}`}
                    loading="lazy"
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-full mr-4 flex items-center justify-center text-primary-foreground font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {testimonial.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold">{testimonial.name}</p>
                  {testimonial.role && (
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground italic">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
