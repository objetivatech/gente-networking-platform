import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://comunidade.gentenetworking.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "testimonial" | "referral" | "welcome" | "invitation_accepted";
  from_user_id?: string;
  to_user_id: string;
  content?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  new_member_name?: string;
}

// Email template generators
function testimonialEmailTemplate(fromName: string, toName: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Gente Networking</h1>
    </div>
    <div style="padding: 32px 24px;">
      <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px;">Você recebeu um novo depoimento!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Olá <strong>${toName}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        <strong>${fromName}</strong> escreveu um depoimento para você:
      </p>
      <div style="background: #fff7ed; border-left: 4px solid #f7941d; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <p style="color: #9a3412; font-size: 16px; font-style: italic; line-height: 26px; margin: 0;">"${content}"</p>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Acesse a plataforma para ver todos os seus depoimentos!
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/depoimentos" style="background-color: #f7941d; border-radius: 6px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 32px; display: inline-block;">
          Ver Depoimentos
        </a>
      </div>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding: 24px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Gente Networking - Conectando pessoas, gerando negócios.</p>
      <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0; line-height: 20px;">
        <a href="${APP_URL}/configuracoes" style="color: #1e3a5f;">Gerenciar preferências de notificação</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function referralEmailTemplate(fromName: string, toName: string, contactName: string, contactPhone?: string, contactEmail?: string, notes?: string): string {
  const contactDetails = [
    contactPhone ? `<p style="color: #374151; font-size: 14px; margin: 4px 0;">📱 ${contactPhone}</p>` : '',
    contactEmail ? `<p style="color: #374151; font-size: 14px; margin: 4px 0;">✉️ ${contactEmail}</p>` : '',
    notes ? `<p style="color: #6b7280; font-size: 14px; font-style: italic; margin: 12px 0 0; padding-top: 12px; border-top: 1px solid #dbeafe;">💬 "${notes}"</p>` : '',
  ].join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Gente Networking</h1>
    </div>
    <div style="padding: 32px 24px;">
      <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px;">Você recebeu uma nova indicação!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Olá <strong>${toName}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        <strong>${fromName}</strong> indicou um contato para você:
      </p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #1e3a5f; font-size: 20px; font-weight: bold; margin: 0 0 12px;">${contactName}</p>
        ${contactDetails}
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Acesse a plataforma para ver os detalhes completos!
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/indicacoes" style="background-color: #f7941d; border-radius: 6px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 32px; display: inline-block;">
          Ver Indicações
        </a>
      </div>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding: 24px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Gente Networking - Conectando pessoas, gerando negócios.</p>
      <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0; line-height: 20px;">
        <a href="${APP_URL}/configuracoes" style="color: #1e3a5f;">Gerenciar preferências de notificação</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function welcomeEmailTemplate(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Gente Networking</h1>
    </div>
    <div style="padding: 32px 24px;">
      <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px;">Bem-vindo à comunidade!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Olá <strong>${name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Estamos muito felizes em tê-lo(a) como parte da nossa comunidade de networking!
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        O Gente Networking é uma plataforma onde você pode:
      </p>
      <div style="margin: 24px 0;">
        <p style="color: #374151; font-size: 15px; line-height: 28px; margin: 0;">✅ Registrar reuniões 1-a-1 com outros membros</p>
        <p style="color: #374151; font-size: 15px; line-height: 28px; margin: 0;">✅ Enviar e receber indicações de negócios</p>
        <p style="color: #374151; font-size: 15px; line-height: 28px; margin: 0;">✅ Compartilhar depoimentos sobre membros</p>
        <p style="color: #374151; font-size: 15px; line-height: 28px; margin: 0;">✅ Participar de encontros da comunidade</p>
        <p style="color: #374151; font-size: 15px; line-height: 28px; margin: 0;">✅ Acompanhar seu progresso no ranking</p>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Complete seu perfil para que outros membros possam conhecê-lo(a) melhor!
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/perfil" style="background-color: #f7941d; border-radius: 6px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 32px; display: inline-block;">
          Completar Meu Perfil
        </a>
      </div>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding: 24px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Gente Networking - Conectando pessoas, gerando negócios.</p>
    </div>
  </div>
</body>
</html>`;
}

function invitationAcceptedEmailTemplate(inviterName: string, newMemberName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Gente Networking</h1>
    </div>
    <div style="padding: 32px 24px;">
      <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px;">🎉 Seu convite foi aceito!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Olá <strong>${inviterName}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Ótima notícia! <strong>${newMemberName}</strong> aceitou seu convite e agora faz parte da comunidade Gente Networking!
      </p>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <p style="color: #047857; font-size: 18px; font-weight: bold; margin: 0;">+30 pontos</p>
        <p style="color: #059669; font-size: 14px; margin: 8px 0 0;">Você ganhou pontos por trazer um novo membro!</p>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Continue convidando pessoas e acumulando pontos para subir no ranking!
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/convites" style="background-color: #f7941d; border-radius: 6px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 32px; display: inline-block;">
          Ver Meus Convites
        </a>
      </div>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding: 24px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Gente Networking - Conectando pessoas, gerando negócios.</p>
    </div>
  </div>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("Received notification request:", payload);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch recipient profile with notification preferences
    const { data: toUser, error: toUserError } = await supabase
      .from("profiles")
      .select("full_name, email, email_notifications_enabled, notify_on_testimonial, notify_on_referral")
      .eq("id", payload.to_user_id)
      .single();

    if (toUserError || !toUser?.email) {
      console.log("No email found for recipient or error:", toUserError);
      return new Response(JSON.stringify({ success: false, reason: "no_email" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user has email notifications enabled
    if (!toUser.email_notifications_enabled) {
      console.log("User has disabled email notifications");
      return new Response(JSON.stringify({ success: false, reason: "notifications_disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check specific notification preferences
    if (payload.type === "testimonial" && !toUser.notify_on_testimonial) {
      console.log("User has disabled testimonial notifications");
      return new Response(JSON.stringify({ success: false, reason: "testimonial_notifications_disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (payload.type === "referral" && !toUser.notify_on_referral) {
      console.log("User has disabled referral notifications");
      return new Response(JSON.stringify({ success: false, reason: "referral_notifications_disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let fromUser = { full_name: "Gente Networking" };
    if (payload.from_user_id) {
      const { data: fromData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", payload.from_user_id)
        .single();
      if (fromData) fromUser = fromData;
    }

    let subject: string;
    let html: string;

    if (payload.type === "testimonial") {
      subject = `🎉 ${fromUser.full_name} enviou um depoimento para você!`;
      html = testimonialEmailTemplate(
        fromUser.full_name,
        toUser.full_name,
        payload.content || "Depoimento não disponível"
      );
    } else if (payload.type === "referral") {
      subject = `📞 ${fromUser.full_name} indicou um contato para você!`;
      html = referralEmailTemplate(
        fromUser.full_name,
        toUser.full_name,
        payload.contact_name || "Contato",
        payload.contact_phone,
        payload.contact_email,
        payload.notes
      );
    } else if (payload.type === "welcome") {
      subject = `🎉 Bem-vindo ao Gente Networking, ${toUser.full_name}!`;
      html = welcomeEmailTemplate(toUser.full_name);
    } else if (payload.type === "invitation_accepted") {
      subject = `🎉 Seu convite foi aceito! ${payload.new_member_name} entrou na comunidade`;
      html = invitationAcceptedEmailTemplate(
        toUser.full_name,
        payload.new_member_name || "Novo membro"
      );
    } else {
      return new Response(JSON.stringify({ success: false, reason: "unknown_type" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending email to:", toUser.email);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gente Networking <noreply@gentenetworking.com.br>",
        to: [toUser.email],
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
