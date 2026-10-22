/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';
import { HeroBlock } from './HeroBlock';
import { CountdownBlock } from './CountdownBlock';
import { CTABlock } from './CTABlock';
import { BannerBlock } from './BannerBlock';
import { InfoBlock } from './InfoBlock';
import { FormBlock } from './FormBlock';
import { TestimonialsBlock } from './TestimonialsBlock';
import { GalleryBlock } from './GalleryBlock';
import { VideoBlock } from './VideoBlock';
import { FAQBlock } from './FAQBlock';

interface BlockRendererProps {
  blocks: PageBlock[];
  landingPageId: string;
  source: string;
  whatsappLink?: string;
  eventDate?: string;
  primaryColor?: string;
  logoUrl?: string;
  logoSize?: string;
  pageName?: string;
  onFormSuccess?: () => void;
  onCountdownExpire?: () => void;
  showNetworkingGoals?: boolean;
}

export function BlockRenderer({
  blocks,
  landingPageId,
  source,
  whatsappLink,
  eventDate,
  primaryColor,
  logoUrl,
  logoSize,
  pageName,
  onFormSuccess,
  onCountdownExpire,
  showNetworkingGoals = true
}: BlockRendererProps) {
  const visibleBlocks = blocks.filter(block => block.is_visible);

  return (
    <div className="w-full">
      {visibleBlocks.map((block) => {
        const key = block.id;
        
        switch (block.block_type) {
          case 'hero':
            return <HeroBlock key={key} block={block} primaryColor={primaryColor} logoUrl={logoUrl} logoSize={logoSize} pageName={pageName} />;
          case 'countdown':
            return (
              <CountdownBlock 
                key={key} 
                block={block} 
                eventDate={eventDate}
                primaryColor={primaryColor}
                onExpire={onCountdownExpire}
              />
            );
          case 'cta':
            return <CTABlock key={key} block={block} primaryColor={primaryColor} />;
          case 'banner':
            return <BannerBlock key={key} block={block} />;
          case 'info':
            return <InfoBlock key={key} block={block} primaryColor={primaryColor} />;
          case 'form':
            return (
              <FormBlock 
                key={key} 
                block={block} 
                landingPageId={landingPageId}
                source={source}
                primaryColor={primaryColor}
                onSuccess={onFormSuccess}
                showNetworkingGoals={showNetworkingGoals}
              />
            );
          case 'testimonials':
            return <TestimonialsBlock key={key} block={block} primaryColor={primaryColor} />;
          case 'gallery':
            return <GalleryBlock key={key} block={block} />;
          case 'video':
            return <VideoBlock key={key} block={block} />;
          case 'faq':
            return <FAQBlock key={key} block={block} primaryColor={primaryColor} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
