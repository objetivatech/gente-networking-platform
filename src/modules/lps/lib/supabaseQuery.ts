/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
/**
 * Helper para queries do Supabase com timeout e melhor tratamento de erros
 */

export class QueryTimeoutError extends Error {
  constructor(message = 'A consulta excedeu o tempo limite') {
    super(message);
    this.name = 'QueryTimeoutError';
  }
}

/**
 * Converte PromiseLike para Promise nativa
 */
function toPromise<T>(promiseLike: PromiseLike<T>): Promise<T> {
  return Promise.resolve(promiseLike);
}

export async function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  timeoutMs: number = 10000
): Promise<T> {
  const promise = toPromise(promiseLike);
  
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new QueryTimeoutError(`Timeout após ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    throw error;
  }
}

export function formatSupabaseError(error: unknown): string {
  if (error instanceof QueryTimeoutError) {
    return 'Conexão lenta. Tente novamente.';
  }
  
  if (error instanceof Error) {
    // Erros comuns do Supabase
    if (error.message.includes('JWT')) {
      return 'Sessão expirada. Faça login novamente.';
    }
    if (error.message.includes('row-level security')) {
      return 'Sem permissão para acessar estes dados.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Erro de conexão. Verifique sua internet.';
    }
    return error.message;
  }
  
  return 'Erro desconhecido';
}
