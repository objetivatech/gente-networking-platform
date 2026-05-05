/**
 * @copyright Ranktop
 *
 * Utilitários para sanitizar payloads de formulários antes de enviar ao Supabase.
 * Converte strings vazias em null, faz trim e remove campos undefined.
 * Há também uma blindagem equivalente no banco (trigger normalize_empty_strings_to_null),
 * mas aplicar aqui evita roundtrips e melhora UX/validação.
 */

/**
 * Normaliza valores de um objeto para envio ao banco:
 * - Trim em strings
 * - Strings vazias (após trim) viram null
 * - Remove chaves com valor undefined
 *
 * @param input objeto bruto vindo do formulário
 * @param options.preserveEmpty lista de chaves cujos valores vazios devem ser mantidos como ""
 */
export function sanitizePayload<T extends Record<string, any>>(
  input: T,
  options: { preserveEmpty?: string[] } = {}
): Partial<T> {
  const preserve = new Set(options.preserveEmpty ?? []);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed === '' && !preserve.has(k)) {
        out[k] = null;
      } else {
        out[k] = trimmed;
      }
    } else {
      out[k] = v;
    }
  }
  return out as Partial<T>;
}

/**
 * Versão para um único valor — útil em onChange/handlers pontuais.
 */
export function emptyToNull(value: unknown): unknown {
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' ? null : t;
  }
  return value;
}
