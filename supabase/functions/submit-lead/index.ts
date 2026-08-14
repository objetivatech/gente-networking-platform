/**
 * submit-lead - Ingestão pública de leads (LPs, site externo, API).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * v3.34.0:
 * - Parser correto de chaves com colchetes (Elementor: fields[name][value]).
 * - Resolução automática de grupo por NOME (sem UUID nas LPs).
 * - Auto-descoberta de páginas de captação (crm_lead_pages).
 * - Sem grupo: HUB apenas quando source = lp_gentehub; demais ficam "sem_grupo".
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SOURCES = [
  "lp_gentehub",
  "lp_participe",
  "lp_networking",
  "site_elementor",
  "convite_manual",
  "api",
] as const;

const BodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  business_segment: z.string().trim().max(120).optional().nullable(),
  target_team_id: z.string().uuid().optional().nullable(),
  target_team_name: z.string().trim().max(200).optional().nullable(),
  page_url: z.string().trim().max(500).optional().nullable(),
  page_title: z.string().trim().max(200).optional().nullable(),
  source: z.enum(SOURCES),
  source_detail: z.string().trim().max(500).optional().nullable(),
  invitation_code: z.string().trim().max(40).optional().nullable(),
  invited_by: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  app_base_url: z.string().url().optional(),
});

function genCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

/** Normaliza texto para comparação: sem acento, minúsculo, só alfanumérico. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Converte chaves com colchetes em caminho.
 * "fields[name][value]" -> ["fields","name","value"]
 * "form_fields[email]"  -> ["form_fields","email"]
 */
function keyPath(key: string): string[] {
  const parts: string[] = [];
  const head = key.split("[")[0];
  if (head) parts.push(head);
  for (const m of key.matchAll(/\[([^\]]*)\]?/g)) {
    if (m[1] !== undefined && m[1] !== "") parts.push(m[1]);
  }
  return parts;
}

/**
 * Normaliza payloads de formulários externos (Elementor e similares).
 * Aceita tanto `fields[email][value]` quanto `form_fields[email]` ou `email`.
 */
function normalizeFormEntries(entries: Iterable<[string, FormDataEntryValue | string]>) {
  const flat: Record<string, string> = {};
  const meta: Record<string, string> = {};

  for (const [rawKey, rawVal] of entries) {
    const value = typeof rawVal === "string" ? rawVal : String(rawVal);
    const path = keyPath(rawKey);
    if (path.length === 0) continue;

    const root = path[0];

    // meta[page_url][value] etc.
    if (root === "meta") {
      if (path.length >= 2 && (path[path.length - 1] === "value" || path.length === 2)) {
        meta[path[1]] = value;
      }
      continue;
    }

    // form[id] / form[name] — ignorado (identificação do form)
    if (root === "form") {
      if (path[1] === "name" && value) meta["form_name"] = value;
      continue;
    }

    let fieldId: string | null = null;
    let isValue = false;

    if (root === "fields" || root === "form_fields") {
      if (path.length >= 3) {
        fieldId = path[1];
        isValue = path[2] === "value" || path[2] === "raw_value";
      } else if (path.length === 2) {
        fieldId = path[1];
        isValue = true;
      }
    } else if (path.length >= 2) {
      // "name][value" nunca mais chega aqui, mas cobrimos "email[value]"
      fieldId = root;
      isValue = path[path.length - 1] === "value" || path[path.length - 1] === "raw_value";
    } else {
      fieldId = root;
      isValue = true;
    }

    if (!fieldId || !isValue) continue;
    // não sobrescreve valor preenchido por string vazia
    if (flat[fieldId] && !value) continue;
    flat[fieldId] = value;
  }

  return { flat, meta };
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
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    let raw: Record<string, unknown> = {};
    let meta: Record<string, string> = {};

    if (
      ct.includes("application/x-www-form-urlencoded") ||
      ct.includes("multipart/form-data")
    ) {
      const fd = await req.formData();
      const parsedForm = normalizeFormEntries(fd.entries());
      raw = parsedForm.flat;
      meta = parsedForm.meta;
    } else {
      raw = await req.json().catch(() => ({}));
      // JSON também pode vir com chaves aninhadas de forms
      if (raw && typeof raw === "object" && Object.keys(raw).some((k) => k.includes("["))) {
        const parsedForm = normalizeFormEntries(
          Object.entries(raw).map(([k, v]) => [k, String(v ?? "")] as [string, string]),
        );
        raw = { ...parsedForm.flat };
        meta = parsedForm.meta;
      }
    }

    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = (raw as Record<string, unknown>)[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return undefined;
    };

    // Aliases comuns de forms externos
    const normalized: Record<string, unknown> = {
      name: pick("name", "full_name", "nome", "seu_nome"),
      email: pick("email", "e_mail", "seu_email"),
      phone: pick("phone", "tel", "telefone", "whatsapp", "celular"),
      company: pick("company", "empresa"),
      business_segment: pick("business_segment", "segment", "segmento", "segmento_de_negocio"),
      target_team_id: pick("target_team_id", "crm_team_id"),
      target_team_name: pick(
        "target_team_name",
        "group",
        "grupo",
        "primeira_opcao",
        "grupo_desejado",
      ),
      page_url: pick("page_url", "landing_page_url") ?? meta["page_url"],
      page_title: pick("page_title", "landing_page") ?? meta["form_name"],
      source: pick("source"),
      source_detail: pick("source_detail", "landing_page") ?? meta["form_name"],
      invitation_code: pick("invitation_code", "convite"),
      invited_by: pick("invited_by", "ref"),
      notes: pick("notes", "mensagem", "observacoes"),
      app_base_url: pick("app_base_url"),
    };

    if (!normalized.source || !SOURCES.includes(normalized.source as typeof SOURCES[number])) {
      normalized.source = "site_elementor";
    }
    if (normalized.target_team_id && !/^[0-9a-f-]{36}$/i.test(String(normalized.target_team_id))) {
      normalized.target_team_id = undefined;
    }
    Object.keys(normalized).forEach((k) => {
      if (normalized[k] === undefined) delete normalized[k];
    });

    const parsed = BodySchema.safeParse(normalized);
    if (!parsed.success) {
      console.error("[submit-lead] invalid payload", parsed.error.flatten(), "raw:", raw);
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

    // ---- Resolução automática de grupo -------------------------------------
    let teamId: string | null = data.target_team_id ?? null;
    let groupResolution: "explicit_id" | "matched_by_name" | "hub_triage" | "sem_grupo" =
      teamId ? "explicit_id" : "sem_grupo";

    if (!teamId && data.target_team_name) {
      const { data: teams } = await supabase.from("teams").select("id, name, is_hub");
      const target = norm(data.target_team_name);
      const match = (teams ?? []).find((t) => {
        const n = norm(t.name);
        return n === target || target.includes(n) || n.includes(target);
      });
      if (match) {
        teamId = match.id;
        groupResolution = "matched_by_name";
      }
    }

    if (!teamId && data.source === "lp_gentehub") {
      // Trigger crm_leads_route_hub cuida do vínculo com o grupo HUB.
      groupResolution = "hub_triage";
    }

    // ---- Inviter padrão -----------------------------------------------------
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

    // ---- Dedup por email ----------------------------------------------------
    const { data: existing } = await supabase
      .from("crm_leads")
      .select("id, invitation_id, status, phone, company, business_segment, notes, target_team_id, metadata")
      .eq("email", data.email)
      .maybeSingle();

    let leadId = existing?.id;
    let invitationId = existing?.invitation_id;
    let invitationCode: string | null = null;

    if (!invitationId) {
      const code = genCode();
      const invitePurpose = teamId ? "premium_group" : "hub_legacy";
      const inviteTarget = teamId ? "comunidade" : data.source === "lp_gentehub" ? "hub" : "comunidade";
      const { data: inv, error: invErr } = await supabase
        .from("invitations")
        .insert({
          code,
          email: data.email,
          name: data.name,
          invited_by: defaultInviter,
          team_id: teamId,
          invite_target: inviteTarget,
          invite_purpose: invitePurpose,
          status: "pending",
          metadata: {
            source: data.source,
            source_detail: data.source_detail ?? null,
            page_url: data.page_url ?? null,
          },
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

    const trackedInviter = data.invited_by ?? defaultInviter;
    const leadPayload = {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      company: data.company ?? null,
      business_segment: data.business_segment ?? null,
      source: data.source,
      source_detail: data.source_detail ?? data.page_url ?? null,
      target_team_id: teamId,
      invitation_id: invitationId,
      invited_by: trackedInviter,
      notes: data.notes ?? null,
      metadata: {
        invitation_code: data.invitation_code ?? null,
        landing_page: data.source_detail ?? null,
        page_url: data.page_url ?? null,
        page_title: data.page_title ?? null,
        group_resolution: groupResolution,
        requested_group: data.target_team_name ?? null,
      },
    };

    if (leadId) {
      // v3.35.0 — Atualização NÃO destrutiva: só sobrescreve o que veio preenchido,
      // preserva metadata anterior (merge) e nunca rebaixa o status do funil.
      const prevMeta = (existing?.metadata ?? {}) as Record<string, unknown>;
      const mergedPayload: Record<string, unknown> = {
        name: leadPayload.name,
        email: leadPayload.email,
        phone: leadPayload.phone ?? existing?.phone ?? null,
        company: leadPayload.company ?? existing?.company ?? null,
        business_segment: leadPayload.business_segment ?? existing?.business_segment ?? null,
        source: leadPayload.source,
        source_detail: leadPayload.source_detail ?? null,
        target_team_id: leadPayload.target_team_id ?? existing?.target_team_id ?? null,
        invitation_id: leadPayload.invitation_id,
        invited_by: leadPayload.invited_by,
        notes: leadPayload.notes ?? existing?.notes ?? null,
        metadata: { ...prevMeta, ...leadPayload.metadata },
      };
      await supabase.from("crm_leads").update(mergedPayload).eq("id", leadId);
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

    // ---- Auto-descoberta da página de captação ------------------------------
    const pageKey = data.page_url
      ? data.page_url.split("?")[0].replace(/\/$/, "")
      : (data.source_detail ?? data.page_title ?? null);
    if (pageKey) {
      const { error: pageErr } = await supabase.rpc("register_crm_lead_page", {
        _page_key: pageKey,
        _page_url: data.page_url ?? null,
        _title: data.page_title ?? data.source_detail ?? null,
        _source: data.source,
      });
      if (pageErr) console.error("[submit-lead] page register failed (non-blocking)", pageErr);
    }

    // ---- Email de boas-vindas (best-effort) ---------------------------------
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
        ok: true,
        lead_id: leadId,
        invitation_id: invitationId,
        invitation_code: invitationCode,
        invite_url: inviteUrl,
        team_id: teamId,
        group_resolution: groupResolution,
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
