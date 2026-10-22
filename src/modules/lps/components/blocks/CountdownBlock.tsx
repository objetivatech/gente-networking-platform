/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';
import { CountdownTimer } from '@/modules/lps/components/landing/CountdownTimer';
import { handleSmoothScroll } from '@/modules/lps/lib/scroll';

interface CountdownBlockProps {
  block: PageBlock;
  eventDate?: string;
  primaryColor?: string;
  onExpire?: () => void;
}

export function CountdownBlock({ block, eventDate, primaryColor = 'hsl(var(--secondary))', onExpire }: CountdownBlockProps) {
  const targetDate = eventDate || (block.settings as { target_date?: string })?.target_date;

  if (!targetDate) {
    return (
      <section 
        className="py-16 px-4"
        style={{ backgroundColor: block.background_color || 'hsl(var(--primary))' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary-foreground">Configure a data do evento no painel admin</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="py-16 px-4"
      style={{ backgroundColor: block.background_color || 'hsl(var(--primary))' }}
    >
      <div className="max-w-4xl mx-auto text-center">
        {block.title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-8"
            style={{ color: block.text_color || 'hsl(var(--primary-foreground))' }}
          >
            {block.title}
          </h2>
        )}
        <CountdownTimer
          targetDate={targetDate}
          onExpire={onExpire}
          primaryColor={primaryColor}
        />
        {block.subtitle && (
          <p
            className="text-lg mt-8 opacity-90"
            style={{ color: block.text_color || 'hsl(var(--primary-foreground))' }}
          >
            {block.subtitle}
          </p>
        )}
        {block.button_text && block.button_link && (
          <div className="mt-8">
            <a
              href={block.button_link}
              onClick={(e) => handleSmoothScroll(e, block.button_link || '')}
              className="inline-block px-8 py-4 text-lg font-semibold text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              {block.button_text}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
