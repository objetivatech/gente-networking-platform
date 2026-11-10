/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { lpMetaTags, type LpMeta } from './_shared/lp-meta';
interface LpEnv { LP_UNIFIED_ENABLED?: string; SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string; VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string }
/** Opt-in host routing: do not redirect the LP domain until export and acceptance gates pass. */
export const onRequest: PagesFunction<LpEnv> = async context => {
  const url = new URL(context.request.url);
  const lpHost = url.hostname === 'lps.gentenetworking.com.br';
  const internalLp = /^\/lps\/[a-z0-9-]+\/?$/.test(url.pathname);
  const friendlyLp = ['participe', 'gentehub', 'comunidade', 'impulso', 'assinantes'].includes(url.pathname.split('/')[1] || '');
  if ((!lpHost || context.env.LP_UNIFIED_ENABLED !== 'true') && !internalLp && !friendlyLp) return context.next();
  const isPublicAsset = /\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/__l5e/');
  if (isPublicAsset || url.pathname === '/obrigado') return context.next();
  const pieces = url.pathname.split('/').filter(Boolean);
  if (pieces[0] === 'admin') return Response.redirect('https://comunidade.gentenetworking.com.br/admin/lps', 302);
  let slug = internalLp ? pieces[1] : pieces[0] || 'inicio';
  let response: Response;
  if (lpHost && context.env.LP_UNIFIED_ENABLED === 'true' && pieces.length <= 1) {
    url.pathname = `/lps/${pieces[0] || 'inicio'}`;
    response = await context.next(new Request(url.toString(), context.request));
  } else if (internalLp || (!lpHost && friendlyLp)) {
    response = await context.next();
  } else {
    return new Response('Página não encontrada', { status: 404 });
  }
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const endpoint = context.env.SUPABASE_URL || context.env.VITE_SUPABASE_URL;
  const key = context.env.SUPABASE_ANON_KEY || context.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!endpoint || !key) return response;
  try {
    const result = await fetch(`${endpoint}/rest/v1/landing_pages?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=slug,name,meta_title,meta_description,og_image_url,canonical_url`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) });
    if (!result.ok) return response;
    const pages = await result.json() as LpMeta[];
    const page = pages[0];
    if (!page) return response;
    const rewritten = new HTMLRewriter()
      .on('title, meta[name="description"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"]', { element(element) { element.remove(); } })
      .on('head', { element(element) { element.append(lpMetaTags(page), { html: true }); } })
      .transform(response);
    rewritten.headers.set('Cache-Control', 'no-cache');
    return rewritten;
  } catch { return response; }
};