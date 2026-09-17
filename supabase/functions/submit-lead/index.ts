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
 *
 * v3.46.0 (identidade única):
 * - Bloqueio na origem: quem já é membro/facilitador ativo não vira lead nem convidado
 *   (retorna 409 `already_member` para a LP exibir a mensagem e o login).
 * - Dedupe por e-mail OU telefone normalizado (últimos 11 dígitos).
 * - União automática de contatos duplicados via RPC `crm_merge_leads` (com histórico).
 *
 * v3.48.0:
 * - Todo cadastro válido entra na jornada de convidado, sem criar acesso automaticamente.
 * - Categoria e e-mail de ativação variam conforme a origem.
 * - Convites pendentes são reutilizados e o autor só vem de código validado no banco.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  classifyOnboardingCategory,
  ONBOARDING_SUBJECTS,
} from "../_shared/guest-onboarding.ts";

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

/** Telefone normalizado: só dígitos, últimos 11 (padrão BR sem DDI). */
function phoneKey(v?: string | null): string | null {
  const digits = (v ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(-11);
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

    const phoneDigits = phoneKey(data.phone);

    // ---- Bloqueio na origem: já é membro/facilitador ativo -------------------
    const identityFilter = phoneDigits
      ? `email.ilike.${data.email},phone_digits.eq.${phoneDigits}`
      : `email.ilike.${data.email}`;

    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, is_active")
      .or(identityFilter)
      .limit(5);

    if (matchedProfiles && matchedProfiles.length > 0) {
      const ids = matchedProfiles.filter((p) => p.is_active).map((p) => p.id);
      if (ids.length > 0) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", ids);
        const isMember = (roles ?? []).some((r) =>
          ["membro", "facilitador", "admin"].includes(r.role as string)
        );
        if (isMember) {
          console.log("[submit-lead] blocked: already member", data.email);
          // v3.47.0 — auditoria do bloqueio (nunca impede a resposta 409)
          try {
            const blockedPageKey = data.page_url
              ? data.page_url.split("?")[0].replace(/\/$/, "")
              : null;
            const { error: logErr } = await supabase.rpc("crm_log_identity_block", {
              _email: data.email ?? null,
              _phone_digits: phoneDigits ?? null,
              _matched_profile_id: ids[0] ?? null,
              _source: data.source ?? null,
              _page_key: blockedPageKey,
              _page_url: data.page_url ?? null,
              _metadata: { name: data.name ?? null },
            });
            if (logErr) console.error("[submit-lead] identity block log failed", logErr);
          } catch (e) {
            console.error("[submit-lead] identity block log threw", e);
          }
          return new Response(
            JSON.stringify({
              ok: false,
              already_member: true,
              message:
                "Você já faz parte do Gente. Acesse a plataforma com seu login para continuar.",
              login_url: `${data.app_base_url ?? "https://comunidade.gentenetworking.com.br"}/auth`,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // ---- Dedup por e-mail OU telefone ---------------------------------------
    const { data: candidates } = await supabase
      .from("crm_leads")
      .select(
        "id, email, phone_digits, invitation_id, invited_by, source, status, phone, company, business_segment, notes, target_team_id, metadata, created_at, profile_id, onboarding_email_status",
      )
      .or(identityFilter)
      .is("archived_at", null)
      .order("created_at", { ascending: true });

    const existing = candidates?.[0];

    // União automática dos demais duplicados no contato mais antigo
    if (existing && candidates && candidates.length > 1) {
      for (const dup of candidates.slice(1)) {
        const { error: mergeErr } = await supabase.rpc("crm_merge_leads", {
          _keep_id: existing.id,
          _dup_id: dup.id,
          _reason: `Identidade única (${phoneDigits && dup.phone_digits === phoneDigits ? "telefone" : "e-mail"}) via ${data.source}`,
        });
        if (mergeErr) console.error("[submit-lead] merge failed (non-blocking)", mergeErr);
      }
    }

    let leadId = existing?.id;
    let invitationId = existing?.invitation_id;
    let invitationCode: string | null = null;
    let verifiedInviter: string | null = null;
    let invitationStatus: string | null = null;
    let createdInvitationId: string | null = null;

    if (data.invitation_code) {
      const { data: codedInvite } = await supabase
        .from("invitations")
        .select("id, code, invited_by, status, expires_at, team_id")
        .eq("code", data.invitation_code)
        .maybeSingle();
      if (
        codedInvite?.status === "pending" &&
        new Date(codedInvite.expires_at).getTime() > Date.now()
      ) {
        invitationId = codedInvite.id;
        invitationCode = codedInvite.code;
        invitationStatus = codedInvite.status;
        verifiedInviter = codedInvite.invited_by;
        teamId = teamId ?? codedInvite.team_id;
      }
    }

    if (invitationId && !invitationCode) {
      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id, code, invited_by, status, expires_at")
        .eq("id", invitationId)
        .maybeSingle();
      const reusable = existingInvite?.status === "pending" &&
        new Date(existingInvite.expires_at).getTime() > Date.now();
      if (reusable) {
        invitationCode = existingInvite.code;
        invitationStatus = existingInvite.status;
        verifiedInviter = existingInvite.invited_by;
      } else {
        invitationId = undefined;
      }
    }

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
      createdInvitationId = inv.id;
      invitationCode = inv.code;
      invitationStatus = "pending";
    } else {
      const { data: inv } = await supabase
        .from("invitations")
        .select("code, status, invited_by")
        .eq("id", invitationId)
        .maybeSingle();
      invitationCode = inv?.code ?? null;
      invitationStatus = inv?.status ?? null;
      verifiedInviter = verifiedInviter ?? inv?.invited_by ?? null;
    }

    const onboardingCategory = classifyOnboardingCategory(
      data.source,
      data.source_detail,
      data.page_url,
      data.page_title,
    );
    const trackedInviter = verifiedInviter ??
      (existing?.source === "convite_manual" ? existing.invited_by : null) ??
      defaultInviter;
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
      onboarding_category: onboardingCategory,
      onboarding_status: existing?.profile_id ? "convidado_ativo" : "cadastro_recebido",
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
      // Mesma pessoa com e-mail diferente: mantém o e-mail principal e guarda o alternativo.
      const sameEmail =
        (existing?.email ?? "").toLowerCase() === leadPayload.email.toLowerCase();
      const altEmails = Array.isArray(prevMeta.alt_emails) ? (prevMeta.alt_emails as string[]) : [];
      if (!sameEmail && !altEmails.includes(leadPayload.email)) altEmails.push(leadPayload.email);
      const mergedPayload: Record<string, unknown> = {
        name: leadPayload.name,
        email: existing?.email ?? leadPayload.email,
        phone: leadPayload.phone ?? existing?.phone ?? null,
        company: leadPayload.company ?? existing?.company ?? null,
        business_segment: leadPayload.business_segment ?? existing?.business_segment ?? null,
        source: leadPayload.source,
        source_detail: leadPayload.source_detail ?? null,
        target_team_id: leadPayload.target_team_id ?? existing?.target_team_id ?? null,
        invitation_id: leadPayload.invitation_id,
        invited_by: leadPayload.invited_by,
        notes: leadPayload.notes ?? existing?.notes ?? null,
        metadata: { ...prevMeta, ...leadPayload.metadata, alt_emails: altEmails },
      };
      await supabase.from("crm_leads").update(mergedPayload).eq("id", leadId);
    } else {
      const { data: newLead, error: leadErr } = await supabase
        .from("crm_leads")
        .insert({ ...leadPayload, status: "novo" })
        .select("id")
        .single();
      if (leadErr) {
        if (leadErr.code === "23505") {
          const { data: racedLead } = await supabase
            .from("crm_leads")
            .select("id, invitation_id")
            .or(identityFilter)
            .is("archived_at", null)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (createdInvitationId && racedLead?.invitation_id !== createdInvitationId) {
            await supabase.from("invitations").delete().eq("id", createdInvitationId).eq("status", "pending");
          }
          if (racedLead?.id) {
            leadId = racedLead.id;
            invitationId = racedLead.invitation_id;
            const { data: racedInvite } = invitationId
              ? await supabase
                .from("invitations")
                .select("code, status")
                .eq("id", invitationId)
                .maybeSingle()
              : { data: null };
            invitationCode = racedInvite?.code ?? null;
            invitationStatus = racedInvite?.status ?? null;
          } else {
            return new Response(
              JSON.stringify({ error: "lead_conflict", details: leadErr.message }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } else {
        console.error("[submit-lead] lead insert failed", leadErr);
        return new Response(
          JSON.stringify({ error: "lead_create_failed", details: leadErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
        }
      }
      if (newLead?.id) leadId = newLead.id;
    }

    // ---- Vínculo automático com o próximo encontro Gente HUB ----------------
    let linkedMeetingId: string | null = null;
    if (leadId && data.source === "lp_gentehub") {
      const today = new Date().toISOString().slice(0, 10);
      const { data: nextHub } = await supabase
        .from("meetings")
        .select("id")
        .eq("event_type", "hub_event")
        .gte("meeting_date", today)
        .order("meeting_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextHub?.id) {
        const { error: linkErr } = await supabase
          .from("meeting_lead_attendances")
          .upsert(
            { lead_id: leadId, meeting_id: nextHub.id },
            { onConflict: "meeting_id,lead_id", ignoreDuplicates: true },
          );
        if (linkErr) console.error("[submit-lead] hub meeting link failed (non-blocking)", linkErr);
        else linkedMeetingId = nextHub.id;
      }
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

    // ---- Email imediato de ativação (best-effort e idempotente) --------------
    const baseUrl = data.app_base_url ?? "https://comunidade.gentenetworking.com.br";
    const inviteUrl = invitationCode ? `${baseUrl}/convite/${invitationCode}` : baseUrl;

    let shouldSendActivation = false;
    if (leadId && invitationStatus !== "accepted") {
      // A troca condicional funciona como uma trava: em duas submissões simultâneas,
      // apenas uma consegue reservar o envio enquanto o estado ainda é `pending`.
      const { data: claimedLead } = await supabase
        .from("crm_leads")
        .update({ onboarding_email_status: "sent" })
        .eq("id", leadId)
        .eq("onboarding_email_status", "pending")
        .select("id")
        .maybeSingle();
      shouldSendActivation = Boolean(claimedLead?.id);
    }
    if (shouldSendActivation && invitationStatus !== "accepted") try {
      const { data: emailResult, error: emailInvokeError } = await supabase.functions.invoke("send-email", {
        body: {
          to: data.email,
          subject: ONBOARDING_SUBJECTS[onboardingCategory],
          template: "guest_activation",
          context: `guest_activation_${onboardingCategory}`,
          template_data: {
            name: data.name,
            guest_name: data.name,
            invite_link: inviteUrl,
            link: inviteUrl,
            onboarding_category: onboardingCategory,
          },
        },
      });
      const sent = !emailInvokeError && emailResult?.ok === true;
      await supabase.from("crm_leads").update({
        onboarding_status: sent ? "aguardando_ativacao" : "cadastro_recebido",
        onboarding_email_status: sent ? "sent" : "error",
        onboarding_email_sent_at: sent ? new Date().toISOString() : null,
      }).eq("id", leadId);
      if (emailInvokeError || !sent) {
        console.error("[submit-lead] activation email failed", emailInvokeError ?? emailResult);
      }
    } catch (emailErr) {
      console.error("[submit-lead] email failed (non-blocking)", emailErr);
      await supabase.from("crm_leads").update({ onboarding_email_status: "error" }).eq("id", leadId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        lead_id: leadId,
        invitation_id: invitationId,
        invitation_code: invitationCode,
        invite_url: inviteUrl,
        team_id: teamId,
        hub_meeting_id: linkedMeetingId,
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
