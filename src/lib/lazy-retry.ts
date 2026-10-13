/**
 * Retentativas limitadas de importação, sem recargas automáticas ou limpeza de sessão.
 * @company Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { lazy, ComponentType } from 'react';

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1500
): React.LazyExoticComponent<T> {
  return lazy(() => retryImport(factory, retries, interval));
}

function retryImport<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries: number,
  interval: number
): Promise<{ default: T }> {
  return factory().catch((error) => {
    const isChunkError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Loading CSS chunk') ||
      error?.name === 'ChunkLoadError';

    // A versão antiga não pode recuperar um arquivo removido repetindo recargas.
    // O worker de recuperação trata caches legados; erros restantes vão ao ErrorBoundary.
    if (isChunkError) throw error;

    if (retries <= 0) {
      throw error;
    }
    return new Promise<{ default: T }>((resolve) => {
      setTimeout(() => {
        resolve(retryImport(factory, retries - 1, interval));
      }, interval);
    });
  });
}
