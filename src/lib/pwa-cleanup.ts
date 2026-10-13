/**
 * Limpeza seletiva do worker de aplicativo em previews, sem registrar novos workers.
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
export function isLegacyAppWorker(registration: ServiceWorkerRegistration): boolean {
  return [registration.active, registration.waiting, registration.installing].some((worker) => {
    if (!worker) return false;
    const url = new URL(worker.scriptURL);
    return url.origin === window.location.origin && url.pathname === '/sw.js';
  });
}

export async function cleanupPreviewAppWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const hostname = window.location.hostname;
  const isPreview = !import.meta.env.PROD || window.self !== window.top ||
    /^(id-preview--|preview--)/.test(hostname) ||
    ['lovableproject.com', 'lovableproject-dev.com', 'beta.lovable.dev'].some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    ) || new URLSearchParams(window.location.search).get('sw') === 'off';
  if (!isPreview) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.filter(isLegacyAppWorker).map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('Não foi possível remover o worker legado do aplicativo.', error);
  }
}