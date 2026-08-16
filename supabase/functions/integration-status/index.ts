/**
 * integration-status - Diagnóstico e gravação das chaves de integração (v3.36.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Admin-only. Informa quais chaves já estão disponíveis (Vault ou ambiente),
 * sem nunca expor o valor, e testa a credencial do provedor ativo.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getSecret } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SECRETS: Record<string, string[]> = {
  payments: [
    "EFI_API_KEY",
    "EFI_CLIENT_ID",
    "EFI_CLIENT_SECRET",
    "MERCADOPAGO_API_KEY",
    "ASAAS_API_KEY",
    "INFINITYPAY_API_KEY",
  ],
  signature: ["AUTENTIQUE_API_KEY", "DOCUSIGN_API_KEY", "CLICKSIGN_API_KEY"],
  email: ["RESEND_API_KEY", "BREVO_API_KEY", "SENDER_API_KEY", "SMTP_API_KEY", "SMTP_HOST", "SMTP_USER"],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Teste leve de credencial por provedor (sem efeitos colaterais). */
async function testProvider(provider: string, key: string): Promise<{ ok: boolean; details: string }> {
  try {
    let res: Response;
    switch (provider) {
      case "resend":
        res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "brevo":
        res = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key } });
        break;
      case "sender":
        res = await fetch("https://api.sender.net/v2/subscribers?limit=1", {
          headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        });
        break;
      case "autentique":
        res = await fetch("https://api.autentique.com.br/v2/graphql", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: "{ me { id email } }" }),
        });
        break;
      case "asaas":
        res = await fetch("https://api.asaas.com/v3/myAccount", { headers: { access_token: key } });
        break;
      case "mercadopago":
        res = await fetch("https://api.mercadopago.com/users/me", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      default:
        return { ok: false, details: "Teste automático indisponível para este provedor." };
    }
    const body = (await res.text()).slice(0, 300);
    return { ok: res.ok, details: res.ok ? "Credencial válida." : `[${res.status}] ${body}` };
  } catch (err) {
    return { ok: false, details: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await authClient.auth.getUser();
    if (!userData.user) return json({ error: "unauthorized" }, 401);

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));

    // Teste de credencial de um provedor específico
    if (body?.action === "test" && body?.provider && body?.secret) {
      const key = await getSecret(String(body.secret));
      if (!key) return json({ ok: false, details: "Chave não configurada." });
      const result = await testProvider(String(body.provider), key);
      await admin
        .from("integration_settings")
        .update({ last_checked_at: new Date().toISOString(), last_check_ok: result.ok })
        .eq("category", body.category ?? "email");
      return json(result);
    }

    const names = Object.values(SECRETS).flat();
    const secrets: Record<string, boolean> = {};
    for (const name of names) secrets[name] = !!(await getSecret(name));

    const { data: audit } = await admin
      .from("integration_secret_audit")
      .select("secret_name, action, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    return json({ ok: true, secrets, audit: audit ?? [] });
  } catch (err) {
    console.error("[integration-status]", err);
    return json({ error: "internal_error", details: String(err) }, 500);
  }
});
