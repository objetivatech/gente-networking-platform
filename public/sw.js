/**
 * Recuperação do cache PWA legado — manter no mesmo endereço por um ciclo de publicação.
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
const legacyRuntimeCaches = new Set([
  'supabase-api-cache',
  'google-fonts-cache',
  'gstatic-fonts-cache',
  'images-cache',
]);

function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return hasWorkboxBucket && name.endsWith(self.registration.scope);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCaches = cacheNames.filter((name) =>
          legacyRuntimeCaches.has(name) || isWorkboxCacheForThisRegistration(name),
        );
        await Promise.allSettled(appCaches.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windows = await self.clients.matchAll({ type: 'window' });
        await Promise.allSettled(windows.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);