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

    // On chunk load failure, do a hard reload once
    if (isChunkError) {
      const reloadKey = 'chunk-reload-' + Date.now().toString(36);
      if (!sessionStorage.getItem('chunk-retry-done')) {
        sessionStorage.setItem('chunk-retry-done', '1');
        window.location.reload();
        // Return a never-resolving promise to prevent rendering stale state
        return new Promise<{ default: T }>(() => {});
      }
      // Already tried reload, clear flag for next time and throw
      sessionStorage.removeItem('chunk-retry-done');
      throw error;
    }

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
