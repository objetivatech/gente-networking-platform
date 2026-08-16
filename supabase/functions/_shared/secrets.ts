/**
 * secrets - Resolução de chaves de integração (v3.36.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Ordem de busca: primeiro o Supabase Vault (chaves salvas pela Central de
 * Integrações), depois as variáveis de ambiente (compatibilidade com o que já
 * estava configurado). O valor nunca é devolvido ao navegador.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cache = new Map<string, { value: string | null; at: number }>();
const TTL_MS = 30_000;

function service(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Devolve a chave do Vault ou, na ausência, do ambiente. */
export async function getSecret(name: string): Promise<string | null> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: string | null = null;
  try {
    const { data, error } = await service().rpc("get_integration_secret", { _name: name });
    if (error) console.error(`[secrets] vault ${name}: ${error.message}`);
    if (typeof data === "string" && data.length > 0) value = data;
  } catch (err) {
    console.error(`[secrets] vault ${name}:`, err);
  }

  if (!value) value = Deno.env.get(name) ?? null;

  cache.set(name, { value, at: Date.now() });
  return value;
}

/** Diz se a chave existe (Vault ou ambiente) sem expor o valor. */
export async function hasSecret(name: string): Promise<boolean> {
  return !!(await getSecret(name));
}
