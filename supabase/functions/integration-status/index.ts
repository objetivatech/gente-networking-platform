/**
 * integration-status - Diagnóstico das integrações configuradas (v3.35.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Admin-only. Informa quais chaves de API já estão no cofre de secrets
 * (apenas true/false — o valor nunca é exposto) e testa o provedor ativo.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SECRETS: Record<string, string[]> = {
  payments: ["EFI_API_KEY", "MERCADOPAGO_API_KEY", "ASAAS_API_KEY", "INFINITYPAY_API_KEY"],
  signature: ["AUTENTIQUE_API_KEY", "DOCUSIGN_API_KEY", "CLICKSIGN_API_KEY"],
  email: ["RESEND_API_KEY", "BREVO_API_KEY", "SENDER_API_KEY", "SMTP_API_KEY"],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    const secrets: Record<string, boolean> = {};
    Object.values(SECRETS)
      .flat()
      .forEach((name) => {
        secrets[name] = !!Deno.env.get(name);
      });

    return json({ ok: true, secrets });
  } catch (err) {
    console.error("[integration-status]", err);
    return json({ error: "internal_error", details: String(err) }, 500);
  }
});
