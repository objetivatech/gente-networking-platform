/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useParams, useLocation } from 'react-router-dom';
import { useLandingPage } from '../hooks/useLandingPage';
import { useBlocks } from '../hooks/useBlocks';
import { useAdvancedPageContent } from '../hooks/useAdvancedPageContent';
import { BlockRenderer } from '../components/blocks/BlockRenderer';
import { CommunityLandingPage, type AdvancedContent } from '../components/landing/CommunityLandingPage';
import { SEOHead } from '../components/seo/SEOHead';
import GenteHub from './GenteHub';
import GenteNetworking from './GenteNetworking';
import NotFound from '@/pages/NotFound';
function DynamicContent({ slug }: { slug: string }) {
  const { data: page, isLoading, error } = useLandingPage(slug);
  const advancedMode = page?.template === 'community';
  const { data: blocks, isLoading: blocksLoading } = useBlocks(!advancedMode ? page?.id : undefined);
  const { data: advanced, isLoading: advancedLoading } = useAdvancedPageContent(advancedMode ? page?.id : undefined);
  if (isLoading || blocksLoading || advancedLoading) return <div className="min-h-screen grid place-items-center" role="status">Carregando…</div>;
  if (error || !page?.is_active) return <NotFound />;
  if (advancedMode) return <CommunityLandingPage page={page} content={(advanced?.content ?? {}) as AdvancedContent} />;
  return <><SEOHead page={page} blocks={blocks} /><main className="min-h-screen"><BlockRenderer blocks={blocks ?? []} landingPageId={page.id} source={page.slug} primaryColor={page.primary_color || undefined} logoUrl={page.logo_url || undefined} logoSize={page.logo_size || 'md'} pageName={page.name} eventDate={page.event_date || undefined} onFormSuccess={() => window.location.assign(`/obrigado?source=${encodeURIComponent(page.slug)}`)} /></main></>;
}
export default function DynamicLandingPage() {
  const { slug: parameter } = useParams();
  const { pathname } = useLocation();
  const slug = parameter || pathname.split('/').filter(Boolean)[0] || 'inicio';
  if (slug === 'gentehub') return <GenteHub />;
  if (slug === 'participe') return <GenteNetworking />;
  return <DynamicContent slug={slug} />;
}