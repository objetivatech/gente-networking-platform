/**
 * Cloudflare Worker — Supabase API Proxy com Edge Cache
 * Versão JavaScript pura para deploy via Dashboard do Cloudflare
 */

const CACHE_CONFIG = {
  '/rest/v1/profiles': { ttl: 120, staleWhileRevalidate: 300 },
  '/rest/v1/teams': { ttl: 300, staleWhileRevalidate: 600 },
  '/rest/v1/team_members': { ttl: 120, staleWhileRevalidate: 300 },
  '/rest/v1/monthly_points': { ttl: 60, staleWhileRevalidate: 120 },
  '/rest/v1/rpc/get_monthly_ranking': { ttl: 60, staleWhileRevalidate: 120 },
  '/rest/v1/rpc/get_user_monthly_points': { ttl: 60, staleWhileRevalidate: 120 },
  '/rest/v1/system_changelog': { ttl: 600, staleWhileRevalidate: 1200 },
  '/rest/v1/contents': { ttl: 300, staleWhileRevalidate: 600 },
  '/rest/v1/meetings': { ttl: 120, staleWhileRevalidate: 300 },
};

const STRIP_HEADERS = ['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry'];

const ALLOWED_ORIGINS = [
  'https://comunidade.gentenetworking.com.br',
  'https://comunidadegente.lovable.app',
];

function getCorsHeaders(origin) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, prefer, range, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Expose-Headers': 'content-range, x-supabase-api-version',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

async function fetchFromSupabase(originalRequest, targetUrl, env) {
  const headers = new Headers();
  for (const [key, value] of originalRequest.headers.entries()) {
    if (!STRIP_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  if (!headers.has('apikey')) {
    headers.set('apikey', env.SUPABASE_ANON_KEY);
  }
  if (!headers.has('Authorization')) {
    headers.set('Authorization', 'Bearer ' + env.SUPABASE_ANON_KEY);
  }
  return fetch(targetUrl, {
    method: originalRequest.method,
    headers,
    body: ['GET', 'HEAD'].includes(originalRequest.method) ? null : originalRequest.body,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', cached_endpoints: Object.keys(CACHE_CONFIG).length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/purge' && request.method === 'POST') {
      const purgePath = url.searchParams.get('path');
      if (purgePath) {
        const cache = caches.default;
        const cacheKey = new Request(env.SUPABASE_URL + purgePath, { method: 'GET' });
        await cache.delete(cacheKey);
        return new Response(JSON.stringify({ purged: purgePath }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const targetUrl = env.SUPABASE_URL + url.pathname + url.search;

    const cacheEntry = request.method === 'GET'
      ? Object.entries(CACHE_CONFIG).find(([path]) => url.pathname.startsWith(path))
      : null;

    if (cacheEntry) {
      const [, config] = cacheEntry;
      const cache = caches.default;
      const cacheKey = new Request(targetUrl, { method: 'GET' });

      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const response = new Response(cachedResponse.body, cachedResponse);
        Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
        response.headers.set('X-Cache', 'HIT');
        response.headers.set('X-Cache-TTL', String(config.ttl));
        return response;
      }

      const supabaseResponse = await fetchFromSupabase(request, targetUrl, env);

      if (supabaseResponse.ok) {
        const responseToCache = new Response(supabaseResponse.body, supabaseResponse);
        responseToCache.headers.set('Cache-Control', 'public, max-age=' + config.ttl + ', stale-while-revalidate=' + config.staleWhileRevalidate);
        responseToCache.headers.set('X-Cache', 'MISS');
        responseToCache.headers.set('X-Cache-TTL', String(config.ttl));
        Object.entries(corsHeaders).forEach(([k, v]) => responseToCache.headers.set(k, v));

        const cacheResponse = responseToCache.clone();
        ctx.waitUntil(cache.put(cacheKey, cacheResponse));

        return responseToCache;
      }

      const errorResponse = new Response(supabaseResponse.body, supabaseResponse);
      Object.entries(corsHeaders).forEach(([k, v]) => errorResponse.headers.set(k, v));
      return errorResponse;
    }

    const response = await fetchFromSupabase(request, targetUrl, env);
    const proxiedResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([k, v]) => proxiedResponse.headers.set(k, v));
    proxiedResponse.headers.set('X-Cache', 'BYPASS');
    return proxiedResponse;
  },
};
