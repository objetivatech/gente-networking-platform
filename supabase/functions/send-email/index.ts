import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  magicLinkEmailTemplate,
  passwordResetEmailTemplate,
  confirmEmailTemplate,
  invitationEmailTemplate,
  meetingRequestEmailTemplate,
  meetingResponseEmailTemplate,
  hubInvitationEmailTemplate,
} from "../_shared/email-templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  template?: "magic_link" | "password_reset" | "confirm_email" | "invitation" | "hub_invitation" | "meeting_request" | "meeting_response";
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
  };
  from?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html: providedHtml, template, template_data, from }: EmailRequest = await req.json();

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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || "Gente Networking <noreply@gentenetworking.com.br>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
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