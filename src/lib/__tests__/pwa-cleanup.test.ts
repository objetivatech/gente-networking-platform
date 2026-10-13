/**
 * Regressões da recuperação PWA e preservação de sessão/caches externos.
 * @company Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { cleanupPreviewAppWorker } from '../pwa-cleanup';

const workerSource = readFileSync('public/sw.js', 'utf8');

async function activateWorker(failListing = false, failDelete = false) {
  const handlers: Record<string, (event: { waitUntil: (promise: Promise<void>) => void }) => void> = {};
  const deleted: string[] = [];
  const unregister = vi.fn().mockResolvedValue(true);
  const navigate = vi.fn().mockResolvedValue(null);
  const scope = 'https://comunidade.gentenetworking.com.br/';
  const keys = ['supabase-api-cache', 'images-cache', `workbox-precache-v2-${scope}`,
    'firebase-messaging-cache', 'onesignal-cache', 'other-app-cache',
    'workbox-precache-v2-https://other.example/'];
  runInNewContext(workerSource, {
    self: {
      addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; },
      skipWaiting: vi.fn(), registration: { scope, unregister },
      clients: { claim: vi.fn().mockResolvedValue(undefined), matchAll: vi.fn().mockResolvedValue([{ url: `${scope}perfil`, navigate }]) },
    },
    caches: {
      keys: async () => { if (failListing) throw new Error('cache unavailable'); return keys; },
      delete: async (name: string) => { deleted.push(name); if (failDelete) throw new Error('delete unavailable'); return true; },
    },
  });
  let activation: Promise<void> | undefined;
  handlers.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation?.catch(() => undefined);
  return { deleted, unregister, navigate };
}

afterEach(() => vi.unstubAllGlobals());

describe('Recuperação PWA', () => {
  it('remove apenas caches conhecidos do aplicativo e navega uma vez', async () => {
    const { deleted, unregister, navigate } = await activateWorker();
    expect(deleted).toEqual(['supabase-api-cache', 'images-cache', 'workbox-precache-v2-https://comunidade.gentenetworking.com.br/']);
    expect(unregister).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(workerSource).not.toMatch(/localStorage|sessionStorage|setInterval|addEventListener\(['"]fetch/);
  });

  it('desregistra mesmo se listar caches falhar', async () => {
    const { unregister } = await activateWorker(true);
    expect(unregister).toHaveBeenCalledOnce();
  });

  it('continua a recuperação se uma exclusão de cache falhar', async () => {
    const { unregister, navigate } = await activateWorker(false, true);
    expect(unregister).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('preview desregistra somente worker legado; preserva dados locais', async () => {
    const appUnregister = vi.fn().mockResolvedValue(true);
    const messagingUnregister = vi.fn();
    localStorage.setItem('pwa-recovery-test', 'preservado');
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistrations: async () => [
        { active: { scriptURL: `${window.location.origin}/sw.js` }, unregister: appUnregister },
        { active: { scriptURL: `${window.location.origin}/firebase-messaging-sw.js` }, unregister: messagingUnregister },
      ] },
    });
    await cleanupPreviewAppWorker();
    expect(appUnregister).toHaveBeenCalledOnce();
    expect(messagingUnregister).not.toHaveBeenCalled();
    expect(localStorage.getItem('pwa-recovery-test')).toBe('preservado');
    localStorage.removeItem('pwa-recovery-test');
  });

  it('manifest mantém as URLs e os ícones da instalação', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(manifest).toMatchObject({ start_url: '/', scope: '/', display: 'standalone' });
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true);
  });
});