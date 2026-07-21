/**
 * migrate-existing-guests - Backfill one-shot: cria crm_leads para convites/convidados existentes.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Uso: chamar via POST (admin autenticado). Idempotente — dedup por email.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Valida se caller é admin
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await authClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stats = { invitations_scanned: 0, leads_created: 0, leads_updated: 0, skipped: 0 };

    // 1) Convites aceitos
    const { data: invitations } = await supabase
      .from("invitations")
      .select("id, email, name, invited_by, team_id, status, created_at, accepted_by")
      .not("email", "is", null);

    for (const inv of invitations ?? []) {
      stats.invitations_scanned++;
      if (!inv.email) { stats.skipped++; continue; }

      // Determina status baseado em role atual do accepted_by
      let leadStatus: "novo" | "em_qualificacao" | "fechado" = "novo";
      let profileId: string | null = null;

      if (inv.status === "accepted" && inv.accepted_by) {
        profileId = inv.accepted_by;
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", inv.accepted_by)
          .maybeSingle();
        if (r?.role === "membro" || r?.role === "facilitador") leadStatus = "fechado";
        else leadStatus = "em_qualificacao";
      }

      const { data: existing } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("email", inv.email.toLowerCase())
        .maybeSingle();

      const payload = {
        name: inv.name ?? inv.email.split("@")[0],
        email: inv.email.toLowerCase(),
        source: "convite_manual" as const,
        source_detail: `invitation:${inv.id}`,
        target_team_id: inv.team_id,
        invitation_id: inv.id,
        invited_by: inv.invited_by,
        profile_id: profileId,
        status: leadStatus,
      };

      if (existing) {
        await supabase.from("crm_leads").update(payload).eq("id", existing.id);
        stats.leads_updated++;
      } else {
        const { error: insErr } = await supabase.from("crm_leads").insert(payload);
        if (insErr) { console.error("insert failed", inv.id, insErr); stats.skipped++; }
        else stats.leads_created++;
      }
    }

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[migrate-existing-guests] error", err);
    return new Response(JSON.stringify({ error: "internal_error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
