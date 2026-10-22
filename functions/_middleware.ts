/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
interface LpEnv { LP_UNIFIED_ENABLED?: string }
/** Opt-in host routing: do not redirect the LP domain until export and acceptance gates pass. */
export const onRequest: PagesFunction<LpEnv> = async context => {
  const url = new URL(context.request.url);
  const lpHost = url.hostname === 'lps.gentenetworking.com.br';
  if (!lpHost || context.env.LP_UNIFIED_ENABLED !== 'true') return context.next();
  const isPublicAsset = /\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/__l5e/');
  if (isPublicAsset || url.pathname.startsWith('/lps/') || url.pathname === '/obrigado') return context.next();
  const pieces = url.pathname.split('/').filter(Boolean);
  if (pieces[0] === 'admin') return Response.redirect('https://comunidade.gentenetworking.com.br/admin/lps', 302);
  if (pieces.length <= 1) {
    url.pathname = `/lps/${pieces[0] || 'inicio'}`;
    return context.next(new Request(url.toString(), context.request));
  }
  return new Response('Página não encontrada', { status: 404 });
};