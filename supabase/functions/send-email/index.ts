/**
 * send-email - Disparo de e-mails da plataforma.
 *
 * v3.35.0: os templates continuam aqui, mas o TRANSPORTE passa a ser o provedor
 * ativo em Configurações → Integrações (Resend, Brevo, Sender...), com registro
 * em `notification_dispatch_log` e limite de disparos configurável.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  magicLinkEmailTemplate,
  passwordResetEmailTemplate,
  confirmEmailTemplate,
  invitationEmailTemplate,
  meetingRequestEmailTemplate,
  meetingResponseEmailTemplate,
  hubInvitationEmailTemplate,
  guestActivationEmailTemplate,
} from "../_shared/email-templates.ts";
import { sendEmail } from "../_shared/email-provider.ts";
import type { OnboardingCategory } from "../_shared/guest-onboarding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  template?: "magic_link" | "password_reset" | "confirm_email" | "invitation" | "hub_invitation" | "guest_activation" | "meeting_request" | "meeting_response";
  template_data?: {
    name?: string;
    link?: string;
    otp?: string;
    inviter_name?: string;
    guest_name?: string;
    invite_link?: string;
    hub_context?: string;
    recipient_name?: string;
    requester_name?: string;
    proposed_start?: string;
    duration_minutes?: number;
    location?: string;
    message?: string;
    status?: "confirmed" | "declined";
    onboarding_category?: OnboardingCategory;
  };
  from?: string;
}

function callerRole(req: Request): string | null {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html: providedHtml, template, template_data, from, context }: EmailRequest & { context?: string } = await req.json();

    // Esse modelo contém um link de ativação e só pode ser chamado por outra
    // função interna com credencial de serviço, nunca diretamente pelo navegador.
    if (template === "guest_activation" && callerRole(req) !== "service_role") {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let html = providedHtml;

    // Use template if specified
    if (template && template_data) {
      const name = template_data.name || "Usuário";
      const link = template_data.link || "";

      switch (template) {
        case "magic_link":
          html = magicLinkEmailTemplate(name, link, template_data.otp);
          break;
        case "password_reset":
          html = passwordResetEmailTemplate(name, link);
          break;
        case "confirm_email":
          html = confirmEmailTemplate(name, link);
          break;
        case "invitation":
          html = invitationEmailTemplate(
            template_data.inviter_name || "Um membro",
            template_data.guest_name || "",
            template_data.invite_link || ""
          );
          break;
        case "hub_invitation":
          html = hubInvitationEmailTemplate(
            template_data.inviter_name || "Um membro",
            template_data.guest_name || "",
            template_data.invite_link || "",
            template_data.hub_context || ""
          );
          break;
        case "guest_activation":
          html = guestActivationEmailTemplate(
            template_data.guest_name || name,
            template_data.invite_link || link,
            template_data.onboarding_category || "outra_origem",
          );
          break;
        case "meeting_request":
          html = meetingRequestEmailTemplate(
            template_data.recipient_name || "",
            template_data.requester_name || "Um membro",
            template_data.proposed_start || "",
            template_data.duration_minutes || 60,
            template_data.location || "",
            template_data.message || "",
            template_data.link || ""
          );
          break;
        case "meeting_response":
          html = meetingResponseEmailTemplate(
            template_data.requester_name || "",
            template_data.recipient_name || "Um membro",
            (template_data.status as "confirmed" | "declined") || "confirmed",
            template_data.proposed_start || "",
            template_data.duration_minutes || 60,
            template_data.location || "",
            template_data.link || ""
          );
          break;
      }
    }

    if (!html) {
      return new Response(JSON.stringify({ error: "No HTML content or template provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // E-mails transacionais (auth, convites) nunca são bloqueados por limite.
    const transactional =
      !template ||
      ["magic_link", "password_reset", "confirm_email", "invitation", "hub_invitation", "guest_activation"].includes(
        template,
      );

    const result = await sendEmail({
      to,
      subject,
      html,
      from,
      context: context ?? template ?? "generic",
      bypassRateLimit: transactional,
    });

    if (!result.ok) {
      console.error("Email dispatch failed:", result);
      return new Response(JSON.stringify(result), {
        status: result.skipped === "rate_limited" ? 429 : (result.status ?? 500),
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully via", result.provider);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);