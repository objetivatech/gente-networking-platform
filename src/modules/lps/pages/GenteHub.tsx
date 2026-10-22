/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLandingPage } from '@/modules/lps/hooks/useLandingPage';
import { useBlocks } from '@/modules/lps/hooks/useBlocks';
import { BlockRenderer } from '@/modules/lps/components/blocks/BlockRenderer';
import { WhatsAppModal } from '@/modules/lps/components/landing/WhatsAppModal';
import { EventLiveModal } from '@/modules/lps/components/landing/EventLiveModal';
import { RDStationScript } from '@/modules/lps/components/landing/RDStationScript';
import { SEOHead } from '@/modules/lps/components/seo/SEOHead';
import { Loader2 } from 'lucide-react';

export default function GenteHub() {
  const navigate = useNavigate();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEventLiveModal, setShowEventLiveModal] = useState(false);
  const { data: page, isLoading: pageLoading } = useLandingPage('gentehub');
  const { data: blocks, isLoading: blocksLoading } = useBlocks(page?.id);

  const handleCountdownExpire = () => {
    if (page?.redirect_when_expired && page?.redirect_to_slug) {
      setShowEventLiveModal(true);
    }
  };

  const handleFormSuccess = () => {
    if (page?.whatsapp_group_link) {
      setShowWhatsAppModal(true);
    }
  };

  if (pageLoading || blocksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--secondary))' }}>
        <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />
      </div>
    );
  }

  if (!page?.is_active) {
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
          source="gentehub"
          whatsappLink={page.whatsapp_group_link || undefined}
          eventDate={page.event_date || undefined}
          primaryColor={page.primary_color || 'hsl(var(--secondary))'}
          logoUrl={page.logo_url || undefined}
          logoSize={page.logo_size || 'md'}
          pageName={page.name}
          onFormSuccess={handleFormSuccess}
          onCountdownExpire={handleCountdownExpire}
          showNetworkingGoals={false}
        />
      </main>
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        whatsappLink={page.whatsapp_group_link || ''}
        primaryColor={page.primary_color || 'hsl(var(--secondary))'}
      />
      <EventLiveModal
        isOpen={showEventLiveModal}
        onClose={() => setShowEventLiveModal(false)}
        redirectUrl={page.redirect_to_slug ? `/${page.redirect_to_slug}` : undefined}
        redirectDelay={5}
        primaryColor={page.primary_color || 'hsl(var(--secondary))'}
      />
    </>
  );
}
