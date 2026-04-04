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
