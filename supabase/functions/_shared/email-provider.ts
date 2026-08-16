/**
 * email-provider - Camada de abstração de disparo de e-mail (v3.35.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Os templates continuam na plataforma Gente; aqui muda apenas o TRANSPORTE.
 * O provedor ativo, o remetente e o limite de disparos vêm de
 * `integration_settings` (categoria `email`). As chaves de API continuam
 * exclusivamente nos secrets do Supabase — nunca no banco.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type EmailProvider = "resend" | "brevo" | "sender" | "smtp";

export interface EmailSettings {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  rateLimitCount: number | null;
  rateLimitWindowHours: number | null;
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  from?: string;
  context?: string;
  referenceId?: string | null;
  /** Ignora o limite de disparos (e-mails transacionais críticos). */
  bypassRateLimit?: boolean;
}

export interface SendEmailResult {
  ok: boolean;
  provider: EmailProvider;
  skipped?: "rate_limited";
  status?: number;
  data?: unknown;
  error?: string;
}

const DEFAULT_FROM_NAME = "Gente Networking";
const DEFAULT_FROM_EMAIL = "noreply@gentenetworking.com.br";

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function getEmailSettings(supabase: SupabaseClient): Promise<EmailSettings> {
  const { data } = await supabase
    .from("integration_settings")
    .select("provider, config, rate_limit_count, rate_limit_window_hours")
    .eq("category", "email")
    .maybeSingle();

  const cfg = (data?.config ?? {}) as Record<string, unknown>;
  const provider = (data?.provider as EmailProvider) || "resend";

  return {
    provider,
    fromName: (cfg.from_name as string) || DEFAULT_FROM_NAME,
    fromEmail: (cfg.from_email as string) || DEFAULT_FROM_EMAIL,
    rateLimitCount: (data?.rate_limit_count as number) ?? null,
    rateLimitWindowHours: (data?.rate_limit_window_hours as number) ?? null,
  };
}

/** Nome do secret esperado para cada provedor. */
export const EMAIL_SECRET_NAME: Record<EmailProvider, string> = {
  resend: "RESEND_API_KEY",
  brevo: "BREVO_API_KEY",
  sender: "SENDER_API_KEY",
  smtp: "SMTP_API_KEY",
};

async function isRateLimited(
  supabase: SupabaseClient,
  settings: EmailSettings,
  context: string,
): Promise<boolean> {
  if (!settings.rateLimitCount || !settings.rateLimitWindowHours) return false;
  const since = new Date(Date.now() - settings.rateLimitWindowHours * 3600_000).toISOString();
  const { count } = await supabase
    .from("notification_dispatch_log")
    .select("id", { count: "exact", head: true })
    .eq("context", context)
    .eq("status", "sent")
    .gte("created_at", since);
  return (count ?? 0) >= settings.rateLimitCount;
}

async function dispatchResend(apiKey: string, from: string, args: SendEmailArgs) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: [args.to], subject: args.subject, html: args.html }),
  });
  return { res, data: await res.json().catch(() => ({})) };
}

async function dispatchBrevo(
  apiKey: string,
  fromName: string,
  fromEmail: string,
  args: SendEmailArgs,
) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: args.to }],
      subject: args.subject,
      htmlContent: args.html,
    }),
  });
  return { res, data: await res.json().catch(() => ({})) };
}

async function dispatchSender(
  apiKey: string,
  fromName: string,
  fromEmail: string,
  args: SendEmailArgs,
) {
  const res = await fetch("https://api.sender.net/v2/campaigns/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      from_name: fromName,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });
  return { res, data: await res.json().catch(() => ({})) };
}

/**
 * Envia e-mail pelo provedor ativo, respeitando limite de disparos,
 * e registra o resultado em `notification_dispatch_log`.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const supabase = adminClient();
  const settings = await getEmailSettings(supabase);
  const context = args.context ?? "generic";

  if (!args.bypassRateLimit && (await isRateLimited(supabase, settings, context))) {
    await supabase.from("notification_dispatch_log").insert({
      provider: settings.provider,
      recipient: args.to,
      subject: args.subject,
      context,
      reference_id: args.referenceId ?? null,
      status: "skipped_rate_limit",
    });
    return { ok: false, provider: settings.provider, skipped: "rate_limited" };
  }
  const secretName = EMAIL_SECRET_NAME[settings.provider];
  const apiKey = (await getSecret(secretName)) ?? (await getSecret("RESEND_API_KEY"));
  const from = args.from ?? `${settings.fromName} <${settings.fromEmail}>`;

  if (!apiKey) {
    await supabase.from("notification_dispatch_log").insert({
      provider: settings.provider,
      recipient: args.to,
      subject: args.subject,
      context,
      reference_id: args.referenceId ?? null,
      status: "error",
      error: `${secretName} não configurado`,
    });
    return { ok: false, provider: settings.provider, error: `${secretName} não configurado` };
  }

  let res: Response;
  let data: unknown;
  try {
    if (settings.provider === "brevo") {
      ({ res, data } = await dispatchBrevo(apiKey, settings.fromName, settings.fromEmail, args));
    } else if (settings.provider === "sender") {
      ({ res, data } = await dispatchSender(apiKey, settings.fromName, settings.fromEmail, args));
    } else {
      ({ res, data } = await dispatchResend(apiKey, from, args));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("notification_dispatch_log").insert({
      provider: settings.provider,
      recipient: args.to,
      subject: args.subject,
      context,
      reference_id: args.referenceId ?? null,
      status: "error",
      error: message,
    });
    return { ok: false, provider: settings.provider, error: message };
  }

  await supabase.from("notification_dispatch_log").insert({
    provider: settings.provider,
    recipient: args.to,
    subject: args.subject,
    context,
    reference_id: args.referenceId ?? null,
    status: res.ok ? "sent" : "error",
    error: res.ok ? null : JSON.stringify(data).slice(0, 500),
  });

  return { ok: res.ok, provider: settings.provider, status: res.status, data };
}
