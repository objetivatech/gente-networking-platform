/**
 * rescue-optout - Descadastro (LGPD) da régua de resgate (v3.43.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Público (verify_jwt = false). Recebe o id do disparo no link do rodapé do
 * e-mail, marca opt-out no perfil e/ou no lead e cancela a fila pendente.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, message: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f0f4f8;margin:0;padding:48px 16px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center;box-shadow:0 4px 12px rgba(30,58,95,.1)">
<h1 style="color:#1e3a5f;font-size:22px;margin:0 0 12px">${title}</h1>
<p style="color:#475569;font-size:15px;line-height:1.6;margin:0">${message}</p>
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

serve(async (req: Request): Promise<Response> => {
  const id = new URL(req.url).searchParams.get("d") ?? "";
  if (!UUID_RE.test(id)) {
    return page("Link inválido", "Não foi possível identificar o descadastro. Fale com a gente pelo WhatsApp.");
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: d } = await sb
    .from("rescue_dispatches")
    .select("id, profile_id, lead_id")
    .eq("id", id)
    .maybeSingle();

  if (!d) {
    return page("Link inválido", "Este link de descadastro não é mais válido.");
  }

  if (d.profile_id) {
    await sb.from("profiles").update({ rescue_opt_out: true }).eq("id", d.profile_id);
    await sb
      .from("rescue_dispatches")
      .update({ status: "cancelled", cancel_reason: "opt_out" })
      .eq("profile_id", d.profile_id)
      .eq("status", "queued");
  }
  if (d.lead_id) {
    await sb.from("crm_leads").update({ rescue_opt_out: true }).eq("id", d.lead_id);
    await sb
      .from("rescue_dispatches")
      .update({ status: "cancelled", cancel_reason: "opt_out" })
      .eq("lead_id", d.lead_id)
      .eq("status", "queued");
    await sb.from("crm_lead_history").insert({
      lead_id: d.lead_id,
      event_type: "rescue_opt_out",
      reason: "Descadastro solicitado pelo contato",
      metadata: { dispatch_id: id },
    });
  }

  return page(
    "Pronto, você foi descadastrado",
    "Você não vai mais receber e-mails de resgate do Gente Networking. Se mudar de ideia, é só falar com a gente.",
  );
});
