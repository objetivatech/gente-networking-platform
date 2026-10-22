/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import type { LandingPage } from '../../hooks/useLandingPage';
import type { PageBlock } from '../../hooks/useBlocks';
import { canonicalForPage } from '../../lib/rules';
export function SEOHead({ page, blocks = [] }: { page: LandingPage; blocks?: PageBlock[]; baseUrl?: string }) {
  const canonical = page.canonical_url || canonicalForPage(page.slug);
  useEffect(() => {
    const target = window as Window & { dataLayer?: Record<string, unknown>[] };
    (target.dataLayer ??= []).push({ event: 'page_view_lp', page_slug: page.slug, page_title: page.meta_title || page.name });
  }, [page.slug, page.meta_title, page.name]);
  const faq = blocks.find(b => b.block_type === 'faq' && b.is_visible);
  let questions: { question: string; answer: string }[] = [];
  try { const parsed = JSON.parse(faq?.content || '[]'); if (Array.isArray(parsed)) questions = parsed.filter(item => typeof item.question === 'string' && typeof item.answer === 'string'); } catch { /* Invalid editorial data is ignored. */ }
  return <Helmet>
    <title>{page.meta_title || page.name}</title><meta name="description" content={page.meta_description || ''} />
    <link rel="canonical" href={canonical} /><meta name="robots" content="index, follow" />
    <meta property="og:title" content={page.meta_title || page.name} /><meta property="og:description" content={page.meta_description || ''} />
    <meta property="og:type" content="website" /><meta property="og:url" content={canonical} /><meta name="twitter:card" content="summary_large_image" />
    {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
    {questions.length > 0 && <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: questions.map(q => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer } })) }).replace(/</g, '\\u003c')}</script>}
  </Helmet>;
}