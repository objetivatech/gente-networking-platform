import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  magicLinkEmailTemplate,
  passwordResetEmailTemplate,
  confirmEmailTemplate,
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
  template?: "magic_link" | "password_reset" | "confirm_email";
  template_data?: {
    name?: string;
    link?: string;
    otp?: string;
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