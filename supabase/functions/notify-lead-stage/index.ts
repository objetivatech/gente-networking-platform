/**
 * notify-lead-stage - Notificação de troca de coluna no CRM (v3.35.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Disparada quando um lead muda de coluna no Kanban. Só envia quando a coluna
 * de destino está com `notify_on_enter = true`. O transporte usa o provedor
 * ativo configurado em Configurações → Integrações.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const body = await req.json().catch(() => ({}));
    const leadId = String(body.lead_id ?? "");
    const stageKey = String(body.stage_key ?? "");
    if (!leadId || !stageKey) return json({ error: "invalid_payload" }, 400);

    const { data: stage } = await admin
      .from("crm_pipeline_stages")
      .select("key, label, notify_on_enter, notify_emails")
      .eq("key", stageKey)
      .maybeSingle();

    if (!stage?.notify_on_enter) return json({ ok: true, skipped: "notify_disabled" });

    const { data: lead } = await admin
      .from("crm_leads")
      .select("id, name, email, company, source, target_team_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return json({ error: "lead_not_found" }, 404);

    // Destinatários: e-mails configurados na coluna + admins + facilitadores do grupo
    const recipients = new Set<string>((stage.notify_emails ?? []) as string[]);

    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const staffIds = new Set<string>((admins ?? []).map((r) => r.user_id));

    if (lead.target_team_id) {
      const { data: facs } = await admin
        .from("team_members")
        .select("user_id")
        .eq("team_id", lead.target_team_id)
        .eq("is_facilitator", true);
      (facs ?? []).forEach((f) => staffIds.add(f.user_id));
    }

    if (staffIds.size) {
      const { data: profs } = await admin
        .from("profiles")
        .select("email")
        .in("id", Array.from(staffIds));
      (profs ?? []).forEach((p) => p.email && recipients.add(p.email));
    }

    if (!recipients.size) return json({ ok: true, skipped: "no_recipients" });

    const appUrl = "https://comunidade.gentenetworking.com.br/admin/crm";
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#1E3A5F">
        <h2 style="color:#1E3A5F">Lead movido para "${stage.label}"</h2>
        <p><strong>${lead.name}</strong> (${lead.email})${lead.company ? ` — ${lead.company}` : ""}</p>
        <p>Origem: ${lead.source}</p>
        <p><a href="${appUrl}" style="background:#F7941D;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Abrir o CRM</a></p>
      </div>`;

    const results = [];
    for (const to of recipients) {
      results.push(
        await sendEmail({
          to,
          subject: `CRM: ${lead.name} entrou em "${stage.label}"`,
          html,
          context: `crm_stage:${stage.key}`,
          referenceId: lead.id,
        }),
      );
    }

    return json({ ok: true, sent: results.filter((r) => r.ok).length, results });
  } catch (err) {
    console.error("[notify-lead-stage]", err);
    return json({ error: "internal_error", details: String(err) }, 500);
  }
});
