/**
 * monthly-member-report
 *
 * Gera e envia por email (Resend) o resumo mensal de cada membro ativo
 * (reuniões, indicações, presenças, pontos e posição no ranking) e um
 * resumo da comunidade para administradores.
 *
 * Segurança: só executa com o cabeçalho `x-cron-secret` igual ao secret
 * CRON_SECRET (usado pelo pg_cron) OU com um JWT de administrador.
 *
 * Respeita o opt-out `profiles.email_reports_enabled`.
 *
 * @copyright Ranktop / Gente Networking
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

function ym(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function monthBounds(year: number, month0: number) {
  const start = new Date(Date.UTC(year, month0, 1));
  const end = new Date(Date.UTC(year, month0 + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

function memberEmailHtml(name: string, monthLabel: string, s: {
  meetings: number; referrals: number; attendances: number;
  points: number; rank: string; positionDelta: number | null;
}) {
  const deltaTxt = s.positionDelta === null
    ? "Primeiro mês no ranking"
    : s.positionDelta > 0 ? `Subiu ${s.positionDelta} posição(ões)`
    : s.positionDelta < 0 ? `Desceu ${Math.abs(s.positionDelta)} posição(ões)`
    : "Manteve a posição";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1E3A5F">
    <div style="background:#1E3A5F;padding:24px;text-align:center;border-radius:12px 12px 0 0">
      <h1 style="color:#fff;margin:0;font-size:20px">Seu resumo de ${monthLabel}</h1>
    </div>
    <div style="padding:24px;background:#f8fafc;border-radius:0 0 12px 12px">
      <p>Olá, <strong>${name}</strong>! Veja o que você realizou no Gente Networking:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0">🤝 Reuniões (Gente em Ação)</td><td style="text-align:right;font-weight:bold">${s.meetings}</td></tr>
        <tr><td style="padding:8px 0">📨 Indicações enviadas</td><td style="text-align:right;font-weight:bold">${s.referrals}</td></tr>
        <tr><td style="padding:8px 0">📅 Presenças em encontros</td><td style="text-align:right;font-weight:bold">${s.attendances}</td></tr>
        <tr><td style="padding:8px 0">⭐ Pontos no mês</td><td style="text-align:right;font-weight:bold">${s.points} (${s.rank})</td></tr>
      </table>
      <p style="background:#F7941D22;border-left:4px solid #F7941D;padding:12px;border-radius:6px">${deltaTxt}</p>
      <p style="color:#64748b;font-size:12px;margin-top:24px">Você recebe este email por ser membro ativo. Para deixar de recebê-lo, ajuste suas preferências no perfil.</p>
    </div>
  </div>`;
}

function adminEmailHtml(monthLabel: string, c: {
  totalMembers: number; meetings: number; referrals: number; deals: number; dealsValue: number;
}) {
  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1E3A5F">
    <div style="background:#1E3A5F;padding:24px;text-align:center;border-radius:12px 12px 0 0">
      <h1 style="color:#fff;margin:0;font-size:20px">Resumo da comunidade — ${monthLabel}</h1>
    </div>
    <div style="padding:24px;background:#f8fafc;border-radius:0 0 12px 12px">
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0">👥 Membros ativos</td><td style="text-align:right;font-weight:bold">${c.totalMembers}</td></tr>
        <tr><td style="padding:8px 0">🤝 Reuniões registradas</td><td style="text-align:right;font-weight:bold">${c.meetings}</td></tr>
        <tr><td style="padding:8px 0">📨 Indicações</td><td style="text-align:right;font-weight:bold">${c.referrals}</td></tr>
        <tr><td style="padding:8px 0">💼 Negócios fechados</td><td style="text-align:right;font-weight:bold">${c.deals}</td></tr>
        <tr><td style="padding:8px 0">💰 Valor gerado</td><td style="text-align:right;font-weight:bold">${fmt.format(c.dealsValue)}</td></tr>
      </table>
    </div>
  </div>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Gente Networking <noreply@gentenetworking.com.br>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error for", to, err);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // --- Auth: cron secret OR admin JWT ---
    const cronHeader = req.headers.get("x-cron-secret");
    let authorized = false;
    if (CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) {
      authorized = true;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await admin.auth.getUser(token);
        if (userData?.user) {
          const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
          authorized = !!roles?.some((r) => r.role === "admin");
        }
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Optional explicit month, else previous month ---
    let targetYm: string | undefined;
    try { targetYm = (await req.json())?.year_month; } catch { /* no body */ }

    const now = new Date();
    const target = targetYm
      ? new Date(`${targetYm}-01T00:00:00Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const year = target.getUTCFullYear();
    const month0 = target.getUTCMonth();
    const yearMonth = ym(target);
    const { start, end } = monthBounds(year, month0);
    const monthLabel = target.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

    // Previous month for ranking delta
    const prev = new Date(Date.UTC(year, month0 - 1, 1));
    const prevYm = ym(prev);

    // --- Members ---
    const { data: memberRoles } = await admin.from("user_roles").select("user_id").eq("role", "membro");
    const memberIds = (memberRoles || []).map((r) => r.user_id);
    if (memberIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, note: "no members" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email, email_reports_enabled, is_active")
      .in("id", memberIds);

    // Ranking maps (current + previous) for position delta
    const buildPositions = (rows: { user_id: string; points: number }[]) => {
      const map = new Map<string, number>();
      [...rows].sort((a, b) => b.points - a.points).forEach((r, i) => map.set(r.user_id, i + 1));
      return map;
    };
    const { data: curPts } = await admin.from("monthly_points").select("user_id, points, rank").eq("year_month", yearMonth);
    const { data: prevPts } = await admin.from("monthly_points").select("user_id, points").eq("year_month", prevYm);
    const curPos = buildPositions((curPts || []) as any);
    const prevPos = buildPositions((prevPts || []) as any);
    const ptsByUser = new Map((curPts || []).map((r: any) => [r.user_id, r]));

    // Activity in target month
    const { data: meetings } = await admin.from("gente_em_acao").select("user_id").gte("meeting_date", start).lte("meeting_date", end).in("user_id", memberIds);
    const { data: refs } = await admin.from("referrals").select("from_user_id").gte("created_at", `${start}T00:00:00Z`).lte("created_at", `${end}T23:59:59Z`).in("from_user_id", memberIds);
    const { data: monthMeetings } = await admin.from("meetings").select("id").gte("meeting_date", start).lte("meeting_date", end);
    const monthMeetingIds = (monthMeetings || []).map((m) => m.id);
    const { data: atts } = monthMeetingIds.length
      ? await admin.from("attendances").select("user_id").in("meeting_id", monthMeetingIds).in("user_id", memberIds)
      : { data: [] as { user_id: string }[] };

    const countBy = (rows: any[], key: string) => {
      const m = new Map<string, number>();
      (rows || []).forEach((r) => m.set(r[key], (m.get(r[key]) || 0) + 1));
      return m;
    };
    const meetingsBy = countBy(meetings || [], "user_id");
    const refsBy = countBy(refs || [], "from_user_id");
    const attsBy = countBy(atts || [], "user_id");

    // --- Send member emails ---
    let sent = 0;
    for (const p of profiles || []) {
      if (!p.is_active || p.email_reports_enabled === false || !p.email) continue;
      const cp = curPos.get(p.id);
      const pp = prevPos.get(p.id);
      const positionDelta = cp && pp ? pp - cp : null; // positive = subiu
      const pts = ptsByUser.get(p.id);
      const html = memberEmailHtml(p.full_name || "Membro", monthLabel, {
        meetings: meetingsBy.get(p.id) || 0,
        referrals: refsBy.get(p.id) || 0,
        attendances: attsBy.get(p.id) || 0,
        points: pts?.points || 0,
        rank: pts?.rank || "iniciante",
        positionDelta,
      });
      if (await sendEmail(p.email, `Seu resumo de ${monthLabel} · Gente Networking`, html)) sent++;
    }

    // --- Admin community summary ---
    const { data: deals } = await admin.from("business_deals").select("value").gte("deal_date", start).lte("deal_date", end);
    const dealsValue = (deals || []).reduce((acc, d: any) => acc + Number(d.value || 0), 0);
    const adminHtml = adminEmailHtml(monthLabel, {
      totalMembers: memberIds.length,
      meetings: (meetings || []).length,
      referrals: (refs || []).length,
      deals: (deals || []).length,
      dealsValue,
    });
    const { data: adminRoles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (adminRoles || []).map((r) => r.user_id);
    let adminSent = 0;
    if (adminIds.length) {
      const { data: adminProfiles } = await admin.from("profiles").select("email, email_reports_enabled, is_active").in("id", adminIds);
      for (const ap of adminProfiles || []) {
        if (!ap.is_active || ap.email_reports_enabled === false || !ap.email) continue;
        if (await sendEmail(ap.email, `Resumo da comunidade · ${monthLabel}`, adminHtml)) adminSent++;
      }
    }

    return new Response(JSON.stringify({ ok: true, year_month: yearMonth, sent, adminSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("monthly-member-report error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
