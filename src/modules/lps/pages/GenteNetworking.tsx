/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useLandingPage } from '@/modules/lps/hooks/useLandingPage';
import { useBlocks } from '@/modules/lps/hooks/useBlocks';
import { BlockRenderer } from '@/modules/lps/components/blocks/BlockRenderer';
import { RDStationScript } from '@/modules/lps/components/landing/RDStationScript';
import { SEOHead } from '@/modules/lps/components/seo/SEOHead';
import { Loader2 } from 'lucide-react';

export default function GenteNetworking() {
  const { data: page, isLoading: pageLoading } = useLandingPage('participe');
  const { data: blocks, isLoading: blocksLoading } = useBlocks(page?.id);

  if (pageLoading || blocksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #3B82F6 100%)' }}>
        <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Página não encontrada</p>
      </div>
    );
  }

  return (
    <>
      <RDStationScript />
      <SEOHead page={page} blocks={blocks} />
      <main className="min-h-screen">
        <BlockRenderer
          blocks={blocks || []}
          landingPageId={page.id}
          source="participe"
          primaryColor={page.primary_color || 'hsl(var(--primary))'}
          logoUrl={page.logo_url || undefined}
          logoSize={page.logo_size || 'md'}
          pageName={page.name}
        />
      </main>
    </>
  );
}