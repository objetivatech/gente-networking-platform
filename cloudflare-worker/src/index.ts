/**
 * Cloudflare Worker — Supabase API Proxy com Edge Cache
 * 
 * Este Worker atua como proxy reverso entre o frontend e a API REST do Supabase,
 * adicionando cache na edge do Cloudflare para endpoints de leitura frequente.
 * 
 * DEPLOY:
 * 1. Instale o Wrangler CLI: npm install -g wrangler
 * 2. Configure as variáveis: wrangler secret put SUPABASE_URL / SUPABASE_ANON_KEY
 * 3. Deploy: wrangler deploy
 * 
 * Referência: cloudflare-worker/wrangler.toml
 */

// ─── Configuração de Cache ──────────────────────────────────

/** Endpoints cacheaveis e seus TTLs em segundos */
const CACHE_CONFIG: Record<string, { ttl: number; staleWhileRevalidate: number }> = {
  // Perfis de membros - muda pouco, cache longo
  '/rest/v1/profiles': { ttl: 120, staleWhileRevalidate: 300 },
  // Times/grupos - raramente muda
  '/rest/v1/teams': { ttl: 300, staleWhileRevalidate: 600 },
  // Membros de times
  '/rest/v1/team_members': { ttl: 120, staleWhileRevalidate: 300 },
  // Ranking mensal - atualiza ao longo do mês
  '/rest/v1/monthly_points': { ttl: 60, staleWhileRevalidate: 120 },
  // Funções RPC de ranking
  '/rest/v1/rpc/get_monthly_ranking': { ttl: 60, staleWhileRevalidate: 120 },
  '/rest/v1/rpc/get_user_monthly_points': { ttl: 60, staleWhileRevalidate: 120 },
  // Changelog - raramente muda
  '/rest/v1/system_changelog': { ttl: 600, staleWhileRevalidate: 1200 },
  // Conteúdos - muda raramente
  '/rest/v1/contents': { ttl: 300, staleWhileRevalidate: 600 },
  // Meetings - consultados frequentemente
  '/rest/v1/meetings': { ttl: 120, staleWhileRevalidate: 300 },
};

/** Headers que NÃO devem ser repassados ao Supabase */
const STRIP_HEADERS = ['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry'];

// ─── CORS ───────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://comunidade.gentenetworking.com.br',
  'https://comunidadegente.lovable.app',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
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

// ─── Worker Interface ───────────────────────────────────────

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', cached_endpoints: Object.keys(CACHE_CONFIG).length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Purge cache (POST /purge?path=/rest/v1/profiles)
    if (url.pathname === '/purge' && request.method === 'POST') {
      const purgePath = url.searchParams.get('path');
      if (purgePath) {
        const cache = caches.default;
        const cacheKey = new Request(`${env.SUPABASE_URL}${purgePath}`, { method: 'GET' });
        await cache.delete(cacheKey);
        return new Response(JSON.stringify({ purged: purgePath }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Construir URL de destino no Supabase
    const targetUrl = `${env.SUPABASE_URL}${url.pathname}${url.search}`;

    // Verificar se este endpoint é cacheável (apenas GET)
    const cacheEntry = request.method === 'GET'
      ? Object.entries(CACHE_CONFIG).find(([path]) => url.pathname.startsWith(path))
      : null;

    // Se cacheável, tentar buscar do cache
    if (cacheEntry) {
      const [, config] = cacheEntry;
      const cache = caches.default;
      const cacheKey = new Request(targetUrl, { method: 'GET' });

      // Tentar cache hit
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const response = new Response(cachedResponse.body, cachedResponse);
        // Adicionar headers CORS e indicador de cache
        Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
        response.headers.set('X-Cache', 'HIT');
        response.headers.set('X-Cache-TTL', String(config.ttl));
        return response;
      }

      // Cache miss - buscar do Supabase
      const supabaseResponse = await fetchFromSupabase(request, targetUrl, env);

      if (supabaseResponse.ok) {
        // Clonar e cachear
        const responseToCache = new Response(supabaseResponse.body, supabaseResponse);
        responseToCache.headers.set('Cache-Control', `public, max-age=${config.ttl}, stale-while-revalidate=${config.staleWhileRevalidate}`);
        responseToCache.headers.set('X-Cache', 'MISS');
        responseToCache.headers.set('X-Cache-TTL', String(config.ttl));
        Object.entries(corsHeaders).forEach(([k, v]) => responseToCache.headers.set(k, v));

        // Salvar no cache em background
        const cacheResponse = responseToCache.clone();
        ctx.waitUntil(cache.put(cacheKey, cacheResponse));

        return responseToCache;
      }

      // Erro do Supabase - não cachear
      const errorResponse = new Response(supabaseResponse.body, supabaseResponse);
      Object.entries(corsHeaders).forEach(([k, v]) => errorResponse.headers.set(k, v));
      return errorResponse;
    }

    // Endpoint não cacheável - proxy direto
    const response = await fetchFromSupabase(request, targetUrl, env);
    const proxiedResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([k, v]) => proxiedResponse.headers.set(k, v));
    proxiedResponse.headers.set('X-Cache', 'BYPASS');
    return proxiedResponse;
  },
};

// ─── Helpers ────────────────────────────────────────────────

async function fetchFromSupabase(originalRequest: Request, targetUrl: string, env: Env): Promise<Response> {
  const headers = new Headers();

  // Copiar headers relevantes do request original
  for (const [key, value] of originalRequest.headers.entries()) {
    if (!STRIP_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // Garantir apikey e Authorization
  if (!headers.has('apikey')) {
    headers.set('apikey', env.SUPABASE_ANON_KEY);
  }
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${env.SUPABASE_ANON_KEY}`);
  }

  return fetch(targetUrl, {
    method: originalRequest.method,
    headers,
    body: ['GET', 'HEAD'].includes(originalRequest.method) ? null : originalRequest.body,
  });
}
