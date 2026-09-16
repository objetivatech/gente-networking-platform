/**
 * Reenvio administrativo do convite de ativação de um convidado.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { ONBOARDING_SUBJECTS, type OnboardingCategory } from "../_shared/guest-onboarding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({ lead_id: z.string().uuid() });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceRoleKey) throw new Error("Supabase environment is incomplete");

    const token = authorization.slice(7);
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, serviceRoleKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "facilitador"])
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadError } = await admin
      .from("crm_leads")
      .select("id, name, email, target_team_id, invitation_id, onboarding_category")
      .eq("id", parsed.data.lead_id)
      .is("archived_at", null)
      .maybeSingle();
    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "lead_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (roleRow.role === "facilitador") {
      const { data: membership } = await admin
        .from("team_members")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("team_id", lead.target_team_id)
        .eq("is_facilitator", true)
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: invitation } = await admin
      .from("invitations")
      .select("code, status, expires_at")
      .eq("id", lead.invitation_id)
      .maybeSingle();
    if (!invitation || invitation.status !== "pending" || new Date(invitation.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: "invitation_not_reusable" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const category = (lead.onboarding_category || "outra_origem") as OnboardingCategory;
    const { data: result, error: sendError } = await admin.functions.invoke("send-email", {
      body: {
        to: lead.email,
        subject: ONBOARDING_SUBJECTS[category] ?? ONBOARDING_SUBJECTS.outra_origem,
        template: "guest_activation",
        context: `guest_activation_${category}`,
        template_data: {
          guest_name: lead.name,
          invite_link: `https://comunidade.gentenetworking.com.br/convite/${invitation.code}`,
          onboarding_category: category,
        },
      },
    });
    const sent = !sendError && result?.ok === true;
    await admin.from("crm_leads").update({
      onboarding_status: sent ? "aguardando_ativacao" : "cadastro_recebido",
      onboarding_email_status: sent ? "sent" : "error",
      onboarding_email_sent_at: sent ? new Date().toISOString() : null,
    }).eq("id", lead.id);

    if (!sent) {
      return new Response(JSON.stringify({ error: "email_send_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[resend-guest-activation] unexpected", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});