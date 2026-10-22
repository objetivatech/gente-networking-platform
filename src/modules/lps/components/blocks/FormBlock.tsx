/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';
import { LeadForm } from '@/modules/lps/components/landing/LeadForm';

interface FormBlockProps {
  block: PageBlock;
  landingPageId: string;
  source: string;
  primaryColor?: string;
  onSuccess?: () => void;
  showNetworkingGoals?: boolean;
}

// Helper to determine if a color is light or dark
function isLightColor(color: string): boolean {
  // Default to dark if no color
  if (!color) return false;
  
  // Handle hex colors
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Using relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }
  
  // For named colors or other formats, assume dark
  return false;
}

export function FormBlock({ block, landingPageId, source, primaryColor = 'hsl(var(--secondary))', onSuccess, showNetworkingGoals = true }: FormBlockProps) {
  const eventEdition = (block.settings as { event_edition?: string })?.event_edition;
  const backgroundColor = block.background_color || 'hsl(var(--primary))';
  const isLightBg = isLightColor(backgroundColor);
  const formVariant = isLightBg ? 'light' : 'dark';

  return (
    <section
      id="form"
      className="py-16 px-4"
      style={{ backgroundColor }}
    >
      <div className="max-w-md mx-auto">
        {block.title && (
          <h2 
            className="text-3xl font-bold mb-4 text-center"
            style={{ color: block.text_color || (isLightBg ? 'hsl(var(--primary))' : 'hsl(var(--primary-foreground))') }}
          >
            {block.title}
          </h2>
        )}
        {block.subtitle && (
          <p 
            className="text-lg mb-8 text-center opacity-90"
            style={{ color: block.text_color || (isLightBg ? 'hsl(var(--primary))' : 'hsl(var(--primary-foreground))') }}
          >
            {block.subtitle}
          </p>
        )}
        <div className={`rounded-lg p-6 ${isLightBg ? 'bg-background shadow-lg border border-border' : 'bg-background/10 backdrop-blur-sm'}`}>
          <LeadForm 
            landingPageId={landingPageId}
            source={source}
            eventEdition={eventEdition}
            onSuccess={onSuccess}
            buttonText={block.button_text || 'Quero Participar!'}
            buttonColor={primaryColor}
            variant={formVariant}
            showNetworkingGoals={showNetworkingGoals}
          />
        </div>
      </div>
    </section>
  );
}
