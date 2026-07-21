/**
 * submit-lead - Ingestão pública de leads (LPs, site externo, API).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Recebe dados de lead, deduplica por email, cria/atualiza crm_leads,
 * cria invitation automaticamente e dispara email de boas-vindas.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  business_segment: z.string().trim().max(120).optional().nullable(),
  target_team_id: z.string().uuid().optional().nullable(),
  source: z.enum([
    "lp_gentehub",
    "lp_participe",
    "lp_networking",
    "site_elementor",
    "convite_manual",
    "api",
  ]),
  source_detail: z.string().trim().max(500).optional().nullable(),
  app_base_url: z.string().url().optional(),
});

function genCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "invalid_payload", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve inviter default (primeiro admin encontrado)
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    const defaultInviter = adminRow?.user_id;
    if (!defaultInviter) {
      return new Response(
        JSON.stringify({ error: "no_admin_configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert em crm_leads (dedup por email)
    const { data: existing } = await supabase
      .from("crm_leads")
      .select("id, invitation_id, status")
      .eq("email", data.email)
      .maybeSingle();

    let leadId = existing?.id;
    let invitationId = existing?.invitation_id;
    let invitationCode: string | null = null;

    // Se não tem invitation ainda, cria
    if (!invitationId) {
      const code = genCode();
      const { data: inv, error: invErr } = await supabase
        .from("invitations")
        .insert({
          code,
          email: data.email,
          name: data.name,
          invited_by: defaultInviter,
          team_id: data.target_team_id ?? null,
          status: "pending",
          metadata: { source: data.source, source_detail: data.source_detail ?? null },
        })
        .select("id, code")
        .single();

      if (invErr) {
        console.error("[submit-lead] invitation insert failed", invErr);
        return new Response(
          JSON.stringify({ error: "invitation_create_failed", details: invErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      invitationId = inv.id;
      invitationCode = inv.code;
    } else {
      const { data: inv } = await supabase
        .from("invitations")
        .select("code")
        .eq("id", invitationId)
        .maybeSingle();
      invitationCode = inv?.code ?? null;
    }

    const leadPayload = {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      company: data.company ?? null,
      business_segment: data.business_segment ?? null,
      source: data.source,
      source_detail: data.source_detail ?? null,
      target_team_id: data.target_team_id ?? null,
      invitation_id: invitationId,
      invited_by: defaultInviter,
    };

    if (leadId) {
      await supabase.from("crm_leads").update(leadPayload).eq("id", leadId);
    } else {
      const { data: newLead, error: leadErr } = await supabase
        .from("crm_leads")
        .insert({ ...leadPayload, status: "novo" })
        .select("id")
        .single();
      if (leadErr) {
        console.error("[submit-lead] lead insert failed", leadErr);
        return new Response(
          JSON.stringify({ error: "lead_create_failed", details: leadErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      leadId = newLead.id;
    }

    // Dispara email de boas-vindas (best-effort)
    const baseUrl = data.app_base_url ?? "https://comunidade.gentenetworking.com.br";
    const inviteUrl = invitationCode ? `${baseUrl}/convite/${invitationCode}` : baseUrl;

    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: data.email,
          subject: "Bem-vindo(a) ao Gente Networking!",
          template: "invitation",
          template_data: {
            name: data.name,
            guest_name: data.name,
            inviter_name: "Equipe Gente Networking",
            invite_link: inviteUrl,
            link: inviteUrl,
          },
        },
      });
    } catch (emailErr) {
      console.error("[submit-lead] email failed (non-blocking)", emailErr);
    }

    return new Response(
      JSON.stringify({
        lead_id: leadId,
        invitation_id: invitationId,
        invitation_code: invitationCode,
        invite_url: inviteUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[submit-lead] unexpected", err);
    return new Response(
      JSON.stringify({ error: "internal_error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
