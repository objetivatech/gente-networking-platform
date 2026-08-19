/**
 * rescue-runner - Motor da régua de resgate (v3.43.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Responsabilidades:
 *  1. Montar a fila de disparos (ex-membros, convidados e alerta de risco);
 *  2. Respeitar o orçamento diário do provedor (Resend free = 300/dia) com
 *     reserva para e-mails transacionais;
 *  3. Enviar apenas na janela configurada (dias da semana / horário SP);
 *  4. Revalidar cada contato antes do envio (conversão, opt-out, pausa);
 *  5. Registrar tudo em `rescue_dispatches` + `crm_lead_history`.
 *
 * Chamado diariamente por pg_cron. Aceita `{ dry_run, force, only }` no body
 * e `{ dispatch_id }` para envio manual a partir do painel admin.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email-provider.ts";
import { rescueEmailTemplate, memberAtRiskEmailTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const DAY = 86_400_000;

interface RescueSettings {
  daily_budget: number;
  transactional_reserve: number;
  send_days: number[];
  send_hour_start: number;
  send_hour_end: number;
  whatsapp_number: string;
  enabled: boolean;
}

const DEFAULTS: RescueSettings = {
  daily_budget: 300,
  transactional_reserve: 100,
  send_days: [2, 3, 4],
  send_hour_start: 9,
  send_hour_end: 11,
  whatsapp_number: "555121652325",
  enabled: true,
};

interface Campaign {
  id: string;
  audience: string;
  step: number;
  delay_days: number;
  subject: string;
  intro: string | null;
  body_html: string;
  offer_html: string | null;
  cta_label: string;
  whatsapp_message: string;
  active: boolean;
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function getSettings(sb: SupabaseClient): Promise<RescueSettings> {
  const { data } = await sb
    .from("integration_settings")
    .select("config")
    .eq("category", "rescue")
    .maybeSingle();
  return { ...DEFAULTS, ...((data?.config ?? {}) as Partial<RescueSettings>) };
}

/** Horário de São Paulo (UTC-3) — sem dependências externas. */
function spNow(): { weekday: number; hour: number } {
  const d = new Date(Date.now() - 3 * 3600_000);
  return { weekday: d.getUTCDay(), hour: d.getUTCHours() };
}

function inWindow(s: RescueSettings): boolean {
  const { weekday, hour } = spNow();
  return s.send_days.includes(weekday) && hour >= s.send_hour_start && hour < s.send_hour_end;
}

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? "");
}

function whatsappUrl(number: string, message: string, tag: string): string {
  const text = `${message}\n\n(origem: ${tag})`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Quantos e-mails de resgate ainda cabem hoje. */
async function budgetLeft(sb: SupabaseClient, s: RescueSettings) {
  const since = new Date(Date.now() - DAY).toISOString();
  const { count } = await sb
    .from("notification_dispatch_log")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("created_at", since);
  const used = count ?? 0;
  const available = Math.max(0, s.daily_budget - s.transactional_reserve - used);
  return { used, available, dailyBudget: s.daily_budget };
}

// ---------------------------------------------------------------------------
// Montagem da fila
// ---------------------------------------------------------------------------

interface QueueRow {
  audience: string;
  campaign_id: string;
  step: number;
  profile_id: string | null;
  lead_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  scheduled_for: string;
  metadata: Record<string, unknown>;
}

async function buildQueue(sb: SupabaseClient, campaigns: Campaign[]): Promise<number> {
  const rows: QueueRow[] = [];
  const now = Date.now();

  const { data: dispatches } = await sb
    .from("rescue_dispatches")
    .select("audience, step, profile_id, lead_id, status, sent_at, campaign_id");
  const all = dispatches ?? [];

  const sentFor = (key: string, audience: string, step: number) =>
    all.find(
      (d) =>
        d.status === "sent" &&
        d.audience === audience &&
        d.step === step &&
        (d.profile_id === key || d.lead_id === key),
    );
  const existsFor = (key: string, audience: string, step: number) =>
    all.some(
      (d) =>
        d.status !== "cancelled" &&
        d.audience === audience &&
        d.step === step &&
        (d.profile_id === key || d.lead_id === key),
    );

  // ---- Ex-membros -----------------------------------------------------------
  const exCampaigns = campaigns
    .filter((c) => c.audience === "ex_membro" && c.active)
    .sort((a, b) => a.step - b.step);

  const { data: exMembers } = await sb
    .from("profiles")
    .select("id, full_name, email, deactivated_at, rescue_opt_out, rescue_paused_until")
    .eq("is_active", false)
    .eq("rescue_opt_out", false)
    .not("deactivated_at", "is", null)
    .not("email", "is", null);

  for (const p of exMembers ?? []) {
    if (p.rescue_paused_until && new Date(p.rescue_paused_until).getTime() > now) continue;
    let base = new Date(p.deactivated_at as string).getTime();
    for (const c of exCampaigns) {
      const prevSent = c.step === 1 ? null : sentFor(p.id, "ex_membro", c.step - 1);
      if (c.step > 1) {
        if (!prevSent?.sent_at) break;
        base = new Date(prevSent.sent_at as string).getTime();
      }
      if (existsFor(p.id, "ex_membro", c.step)) continue;
      rows.push({
        audience: "ex_membro",
        campaign_id: c.id,
        step: c.step,
        profile_id: p.id,
        lead_id: null,
        recipient_email: p.email as string,
        recipient_name: p.full_name,
        scheduled_for: new Date(base + c.delay_days * DAY).toISOString(),
        metadata: { deactivated_at: p.deactivated_at },
      });
      break; // uma etapa por vez
    }
  }

  // ---- Convidados -----------------------------------------------------------
  const guestCampaigns = campaigns
    .filter((c) => c.audience === "convidado" && c.active)
    .sort((a, b) => a.step - b.step);

  if (guestCampaigns.length) {
    const { data: guestRoles } = await sb.from("user_roles").select("user_id").eq("role", "convidado");
    const guestIds = (guestRoles ?? []).map((r) => r.user_id as string);

    if (guestIds.length) {
      const { data: guestProfiles } = await sb
        .from("profiles")
        .select("id, full_name, email, is_active, deactivated_at, rescue_opt_out, rescue_paused_until")
        .in("id", guestIds)
        .eq("is_active", true)
        .eq("rescue_opt_out", false)
        .is("deactivated_at", null)
        .not("email", "is", null);

      const { data: att } = await sb
        .from("attendances")
        .select("user_id, meetings(meeting_date)")
        .in("user_id", guestIds);

      const lastAttendance = new Map<string, number>();
      for (const a of (att ?? []) as { user_id: string; meetings: { meeting_date: string } | null }[]) {
        const d = a.meetings?.meeting_date ? new Date(a.meetings.meeting_date).getTime() : 0;
        if (d && d > (lastAttendance.get(a.user_id) ?? 0)) lastAttendance.set(a.user_id, d);
      }

      for (const p of guestProfiles ?? []) {
        if (p.rescue_paused_until && new Date(p.rescue_paused_until).getTime() > now) continue;
        const last = lastAttendance.get(p.id);
        if (!last) continue;
        for (const c of guestCampaigns) {
          const prevSent = c.step === 1 ? null : sentFor(p.id, "convidado", c.step - 1);
          let base = last;
          if (c.step > 1) {
            if (!prevSent?.sent_at) break;
            const prevTs = new Date(prevSent.sent_at as string).getTime();
            if (last > prevTs) break; // participou de novo — régua encerrada
            base = prevTs;
          }
          if (existsFor(p.id, "convidado", c.step)) continue;
          rows.push({
            audience: "convidado",
            campaign_id: c.id,
            step: c.step,
            profile_id: p.id,
            lead_id: null,
            recipient_email: p.email as string,
            recipient_name: p.full_name,
            scheduled_for: new Date(base + c.delay_days * DAY).toISOString(),
            metadata: { last_attendance_at: new Date(last).toISOString() },
          });
          break;
        }
      }
    }

    // Leads convidados sem conta (presenças registradas no CRM)
    const { data: leads } = await sb
      .from("crm_leads")
      .select("id, name, email, first_attendance_at, meeting_attendance_count, rescue_opt_out, rescue_paused_until, profile_id, status")
      .is("profile_id", null)
      .eq("rescue_opt_out", false)
      .gt("meeting_attendance_count", 0);

    for (const l of leads ?? []) {
      if (!l.email || !l.first_attendance_at) continue;
      if (["hub_ativo", "fechado"].includes(l.status as string)) continue;
      if (l.rescue_paused_until && new Date(l.rescue_paused_until).getTime() > now) continue;
      const last = new Date(l.first_attendance_at as string).getTime();
      for (const c of guestCampaigns) {
        const prevSent = c.step === 1 ? null : sentFor(l.id, "convidado", c.step - 1);
        let base = last;
        if (c.step > 1) {
          if (!prevSent?.sent_at) break;
          base = new Date(prevSent.sent_at as string).getTime();
        }
        if (existsFor(l.id, "convidado", c.step)) continue;
        rows.push({
          audience: "convidado",
          campaign_id: c.id,
          step: c.step,
          profile_id: null,
          lead_id: l.id,
          recipient_email: l.email as string,
          recipient_name: l.name,
          scheduled_for: new Date(base + c.delay_days * DAY).toISOString(),
          metadata: { last_attendance_at: l.first_attendance_at },
        });
        break;
      }
    }
  }

  if (!rows.length) return 0;
  const { error } = await sb.from("rescue_dispatches").insert(rows);
  if (error) console.error("Falha ao enfileirar:", error.message);
  return rows.length;
}

// ---------------------------------------------------------------------------
// Revalidação e envio
// ---------------------------------------------------------------------------

interface DispatchRow {
  id: string;
  audience: string;
  campaign_id: string | null;
  step: number;
  profile_id: string | null;
  lead_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  metadata: Record<string, unknown>;
}

async function stillEligible(sb: SupabaseClient, d: DispatchRow): Promise<string | null> {
  if (d.profile_id) {
    const { data: p } = await sb
      .from("profiles")
      .select("is_active, rescue_opt_out, rescue_paused_until, deactivated_at")
      .eq("id", d.profile_id)
      .maybeSingle();
    if (!p) return "perfil_removido";
    if (p.rescue_opt_out) return "opt_out";
    if (p.rescue_paused_until && new Date(p.rescue_paused_until).getTime() > Date.now()) return "pausado";

    const { data: role } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", d.profile_id)
      .maybeSingle();

    if (d.audience === "ex_membro") {
      if (p.is_active || (role?.role && role.role !== "convidado")) return "convertido";
    }
    if (d.audience === "convidado") {
      if (role?.role && role.role !== "convidado") return "convertido";
      if (!p.is_active) return "inativo";
      // participou de novo depois do agendamento?
      const since = d.metadata?.last_attendance_at as string | undefined;
      if (since) {
        const { data: att } = await sb
          .from("attendances")
          .select("meetings(meeting_date)")
          .eq("user_id", d.profile_id);
        const newer = (att ?? []).some(
          (a: { meetings: { meeting_date: string } | null }) =>
            a.meetings?.meeting_date && new Date(a.meetings.meeting_date) > new Date(since),
        );
        if (newer && d.step > 1) return "participou_novamente";
      }
    }
  }

  if (d.lead_id) {
    const { data: l } = await sb
      .from("crm_leads")
      .select("status, rescue_opt_out, rescue_paused_until, profile_id")
      .eq("id", d.lead_id)
      .maybeSingle();
    if (!l) return "lead_removido";
    if (l.rescue_opt_out) return "opt_out";
    if (l.rescue_paused_until && new Date(l.rescue_paused_until).getTime() > Date.now()) return "pausado";
    if (["hub_ativo", "fechado"].includes(l.status as string)) return "convertido";
  }

  return null;
}

async function sendDispatch(
  sb: SupabaseClient,
  d: DispatchRow,
  campaigns: Campaign[],
  s: RescueSettings,
): Promise<"sent" | "skipped" | "error"> {
  const reason = await stillEligible(sb, d);
  if (reason) {
    await sb
      .from("rescue_dispatches")
      .update({ status: "cancelled", cancel_reason: reason })
      .eq("id", d.id);
    return "skipped";
  }

  const campaign = campaigns.find((c) => c.id === d.campaign_id);
  if (!campaign) {
    await sb
      .from("rescue_dispatches")
      .update({ status: "cancelled", cancel_reason: "campanha_removida" })
      .eq("id", d.id);
    return "skipped";
  }

  const firstName = (d.recipient_name ?? "").split(" ")[0] || "tudo bem";
  const baseDate =
    (d.metadata?.deactivated_at as string) || (d.metadata?.last_attendance_at as string) || null;
  const daysSince = baseDate
    ? Math.max(0, Math.round((Date.now() - new Date(baseDate).getTime()) / DAY)).toString()
    : "";

  let teamName = "seu grupo";
  if (d.profile_id) {
    const { data: inv } = await sb
      .from("invitations")
      .select("teams(name)")
      .eq("accepted_by", d.profile_id)
      .limit(1)
      .maybeSingle();
    const t = (inv as { teams?: { name?: string } } | null)?.teams?.name;
    if (t) teamName = t;
  }

  const vars = { nome: firstName, dias_desde: daysSince, grupo: teamName };
  const tag = `${d.audience}-etapa${d.step}`;
  const optOutUrl = `${SUPABASE_URL}/functions/v1/rescue-optout?d=${d.id}`;

  const html = rescueEmailTemplate({
    name: firstName,
    headline: render(campaign.subject, vars),
    intro: campaign.intro ? render(campaign.intro, vars) : undefined,
    bodyHtml: render(campaign.body_html, vars),
    offerHtml: campaign.offer_html ? render(campaign.offer_html, vars) : undefined,
    ctaLabel: campaign.cta_label,
    ctaUrl: whatsappUrl(s.whatsapp_number, render(campaign.whatsapp_message, vars), tag),
    optOutUrl,
  });

  const result = await sendEmail({
    to: d.recipient_email,
    subject: render(campaign.subject, vars),
    html,
    context: `rescue_${d.audience}`,
    referenceId: d.lead_id ?? d.profile_id ?? null,
    bypassRateLimit: true, // orçamento próprio da régua
  });

  await sb
    .from("rescue_dispatches")
    .update({
      status: result.ok ? "sent" : "error",
      sent_at: result.ok ? new Date().toISOString() : null,
      error: result.ok ? null : (result.error ?? "falha no envio"),
    })
    .eq("id", d.id);

  // Trilha no CRM
  let leadId = d.lead_id;
  if (!leadId && d.profile_id) {
    const { data: l } = await sb
      .from("crm_leads")
      .select("id")
      .eq("profile_id", d.profile_id)
      .maybeSingle();
    leadId = l?.id ?? null;
  }
  if (leadId) {
    await sb.from("crm_lead_history").insert({
      lead_id: leadId,
      to_status: null,
      event_type: result.ok ? "rescue_email_sent" : "rescue_email_failed",
      reason: campaign.name,
      metadata: { audience: d.audience, step: d.step, campaign_id: campaign.id, tag },
    });
  }

  return result.ok ? "sent" : "error";
}

// ---------------------------------------------------------------------------
// Alerta de membros em risco (prevenção)
// ---------------------------------------------------------------------------

async function riskAlerts(sb: SupabaseClient, campaigns: Campaign[]): Promise<number> {
  const campaign = campaigns.find((c) => c.audience === "risco" && c.active);
  if (!campaign) return 0;
  const cutoff = new Date(Date.now() - campaign.delay_days * DAY);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { data: roles } = await sb.from("user_roles").select("user_id").eq("role", "membro");
  const memberIds = (roles ?? []).map((r) => r.user_id as string);
  if (!memberIds.length) return 0;

  const active = new Set<string>();
  const [ga, refs, deals, att] = await Promise.all([
    sb.from("gente_em_acao").select("user_id").gte("meeting_date", cutoffDate),
    sb.from("referrals").select("from_user_id").gte("created_at", cutoff.toISOString()),
    sb.from("business_deals").select("closed_by_user_id").gte("deal_date", cutoffDate),
    sb.from("attendances").select("user_id").gte("registered_at", cutoff.toISOString()),
  ]);
  (ga.data ?? []).forEach((r) => active.add(r.user_id as string));
  (refs.data ?? []).forEach((r) => active.add(r.from_user_id as string));
  (deals.data ?? []).forEach((r) => active.add(r.closed_by_user_id as string));
  (att.data ?? []).forEach((r) => active.add(r.user_id as string));

  const atRisk = memberIds.filter((id) => !active.has(id));
  if (!atRisk.length) return 0;

  // não repetir alerta do mesmo membro em menos de 90 dias
  const { data: recent } = await sb
    .from("rescue_dispatches")
    .select("profile_id")
    .eq("audience", "risco")
    .gte("created_at", new Date(Date.now() - 90 * DAY).toISOString());
  const alerted = new Set((recent ?? []).map((r) => r.profile_id as string));
  const targets = atRisk.filter((id) => !alerted.has(id));
  if (!targets.length) return 0;

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name")
    .in("id", targets)
    .eq("is_active", true);

  const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
  const adminIds = (admins ?? []).map((r) => r.user_id as string);

  let sent = 0;
  for (const p of profiles ?? []) {
    const { data: tm } = await sb
      .from("team_members")
      .select("team_id, teams(name)")
      .eq("user_id", p.id)
      .limit(1)
      .maybeSingle();
    const teamId = (tm as { team_id?: string } | null)?.team_id ?? null;
    const teamName = (tm as { teams?: { name?: string } } | null)?.teams?.name ?? null;

    const recipients = new Set<string>();
    if (teamId) {
      const { data: facils } = await sb
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId)
        .eq("is_facilitator", true);
      (facils ?? []).forEach((f) => recipients.add(f.user_id as string));
    }
    adminIds.forEach((id) => recipients.add(id));

    const { data: recPro } = await sb
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(recipients))
      .not("email", "is", null);

    for (const r of recPro ?? []) {
      const html = memberAtRiskEmailTemplate(
        (r.full_name ?? "").split(" ")[0] || "time",
        p.full_name as string,
        teamName,
        `mais de ${campaign.delay_days} dias sem registro`,
      );
      const res = await sendEmail({
        to: r.email as string,
        subject: `Membro em risco de saída: ${p.full_name}`,
        html,
        context: "rescue_risco",
        referenceId: p.id,
        bypassRateLimit: true,
      });
      if (res.ok) sent++;
    }

    await sb.from("rescue_dispatches").insert({
      audience: "risco",
      campaign_id: null,
      step: 1,
      profile_id: p.id,
      recipient_email: "interno",
      recipient_name: p.full_name,
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { team_id: teamId, recipients: (recPro ?? []).length },
    });
  }

  return sent;
}

// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = admin();

    // Autorização: cron/serviço (service role) ou usuário admin autenticado.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const isService = token === serviceKey || (!!cronKey && token === cronKey);

    if (!isService) {
      const { data: userData } = await sb.auth.getUser(token);
      const uid = userData?.user?.id;
      if (!uid) {
        return new Response(JSON.stringify({ error: "não autenticado" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const { data: role } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        return new Response(JSON.stringify({ error: "acesso restrito a administradores" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }
    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;
    const force = !!body.force;
    const dispatchId: string | undefined = body.dispatch_id;

    const settings = await getSettings(sb);
    const { data: campaignsData } = await sb.from("rescue_campaigns").select("*");
    const campaigns = (campaignsData ?? []) as Campaign[];

    const action: string | undefined = body.action;

    // Status do orçamento diário e da janela de envio (painel admin)
    if (action === "status") {
      const budget = await budgetLeft(sb, settings);
      const { count: queuedCount } = await sb
        .from("rescue_dispatches")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued");
      const { count: dueCount } = await sb
        .from("rescue_dispatches")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued")
        .lte("scheduled_for", new Date().toISOString());
      return new Response(
        JSON.stringify({
          success: true,
          budget,
          queued: queuedCount ?? 0,
          due: dueCount ?? 0,
          in_window: inWindow(settings),
          settings,
          sp_now: spNow(),
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Envio de teste de uma campanha para um e-mail informado
    if (action === "test") {
      const campaign = campaigns.find((c) => c.id === body.campaign_id);
      const to: string = body.email ?? "";
      if (!campaign || !to) {
        return new Response(JSON.stringify({ error: "campanha ou e-mail ausente" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const vars = {
        nome: body.nome ?? "Maria",
        dias_desde: body.dias_desde ?? String(campaign.delay_days),
        grupo: body.grupo ?? "Grupo Exemplo",
      };
      const tag = `teste-${campaign.audience}-etapa${campaign.step}`;
      const html = rescueEmailTemplate({
        name: vars.nome,
        headline: render(campaign.subject, vars),
        intro: campaign.intro ? render(campaign.intro, vars) : undefined,
        bodyHtml: render(campaign.body_html, vars),
        offerHtml: campaign.offer_html ? render(campaign.offer_html, vars) : undefined,
        ctaLabel: campaign.cta_label,
        ctaUrl: whatsappUrl(settings.whatsapp_number, render(campaign.whatsapp_message, vars), tag),
        optOutUrl: `${SUPABASE_URL}/functions/v1/rescue-optout?d=teste`,
      });
      const res = await sendEmail({
        to,
        subject: `[TESTE] ${render(campaign.subject, vars)}`,
        html,
        context: "rescue_teste",
        referenceId: campaign.id,
        bypassRateLimit: true,
      });
      return new Response(JSON.stringify({ success: res.ok, error: res.error ?? null }), {
        status: res.ok ? 200 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }



    // Envio manual de um item específico (painel admin)
    if (dispatchId) {
      const { data: d } = await sb
        .from("rescue_dispatches")
        .select("*")
        .eq("id", dispatchId)
        .maybeSingle();
      if (!d) {
        return new Response(JSON.stringify({ error: "Disparo não encontrado" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const outcome = await sendDispatch(sb, d as DispatchRow, campaigns, settings);
      return new Response(JSON.stringify({ success: outcome === "sent", outcome }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const queued = await buildQueue(sb, campaigns);
    const budget = await budgetLeft(sb, settings);

    if (!settings.enabled) {
      return new Response(
        JSON.stringify({ success: true, queued, sent: 0, reason: "regua_desativada", budget }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (!force && !inWindow(settings)) {
      return new Response(
        JSON.stringify({ success: true, queued, sent: 0, reason: "fora_da_janela", budget }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: due } = await sb
      .from("rescue_dispatches")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(Math.max(0, budget.available));

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    if (!dryRun) {
      for (const d of (due ?? []) as DispatchRow[]) {
        const outcome = await sendDispatch(sb, d, campaigns, settings);
        if (outcome === "sent") sent++;
        else if (outcome === "skipped") skipped++;
        else errors++;
      }
    }

    const riskSent = dryRun ? 0 : await riskAlerts(sb, campaigns);

    return new Response(
      JSON.stringify({
        success: true,
        queued,
        due: due?.length ?? 0,
        sent,
        skipped,
        errors,
        risk_alerts: riskSent,
        budget,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("rescue-runner falhou:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
