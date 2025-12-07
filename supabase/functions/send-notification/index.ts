import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "testimonial" | "referral";
  from_user_id: string;
  to_user_id: string;
  content?: string;
  contact_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profiles
    const [fromUser, toUser] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", payload.from_user_id).single(),
      supabase.from("profiles").select("full_name, email").eq("id", payload.to_user_id).single(),
    ]);

    if (!toUser.data?.email) {
      console.log("No email found for recipient");
      return new Response(JSON.stringify({ success: false, reason: "no_email" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let subject: string;
    let html: string;

    if (payload.type === "testimonial") {
      subject = `🎉 ${fromUser.data?.full_name || "Alguém"} enviou um depoimento para você!`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Gente Networking</h1>
          <h2>Você recebeu um novo depoimento!</h2>
          <p><strong>${fromUser.data?.full_name || "Um membro"}</strong> escreveu um depoimento para você:</p>
          <blockquote style="background: #f5f5f5; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0;">
            "${payload.content || "Depoimento não disponível"}"
          </blockquote>
          <p>Acesse a plataforma para ver todos os seus depoimentos.</p>
          <a href="https://gentenetworking.com.br/depoimentos" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Ver Depoimentos</a>
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Gente Networking - Conectando pessoas, gerando negócios.</p>
        </div>
      `;
    } else if (payload.type === "referral") {
      subject = `📞 ${fromUser.data?.full_name || "Alguém"} indicou um contato para você!`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Gente Networking</h1>
          <h2>Você recebeu uma nova indicação!</h2>
          <p><strong>${fromUser.data?.full_name || "Um membro"}</strong> indicou um contato para você:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 18px; font-weight: bold;">${payload.contact_name || "Contato"}</p>
          </div>
          <p>Acesse a plataforma para ver os detalhes completos da indicação.</p>
          <a href="https://gentenetworking.com.br/indicacoes" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Ver Indicações</a>
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Gente Networking - Conectando pessoas, gerando negócios.</p>
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ success: false, reason: "unknown_type" }), {
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
        from: "Gente Networking <noreply@gentenetworking.com.br>",
        to: [toUser.data.email],
        subject,
        html,
      }),
    });

    const emailData = await res.json();

    if (!res.ok) {
      console.error("Resend error:", emailData);
      return new Response(JSON.stringify({ error: emailData }), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Notification email sent:", emailData);

    return new Response(JSON.stringify({ success: true, emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
