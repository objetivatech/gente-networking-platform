import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  testimonialEmailTemplate,
  referralEmailTemplate,
  welcomeEmailTemplate,
  invitationAcceptedEmailTemplate,
  guestAttendedEmailTemplate,
  invitationEmailTemplate,
} from "../_shared/email-templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "testimonial" | "referral" | "welcome" | "invitation_accepted" | "guest_attended" | "invitation";
  from_user_id?: string;
  to_user_id: string;
  content?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  new_member_name?: string;
  guest_name?: string;
  meeting_title?: string;
  invite_link?: string;
  guest_email?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gente Networking <noreply@gentenetworking.com.br>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return { success: false, error: data };
    }

    console.log("Email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("Received notification request:", payload);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For invitation type, we send to guest_email directly
    if (payload.type === "invitation" && payload.guest_email) {
      const { data: fromUser } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", payload.from_user_id)
        .single();

      const subject = `🎉 ${fromUser?.full_name || 'Um membro'} convidou você para o Gente Networking!`;
      const html = invitationEmailTemplate(
        fromUser?.full_name || "Um membro",
        payload.contact_name || "",
        payload.invite_link || ""
      );

      const result = await sendEmail(payload.guest_email, subject, html);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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

    switch (payload.type) {
      case "testimonial":
        subject = `🎉 ${fromUser.full_name} enviou um depoimento para você!`;
        html = testimonialEmailTemplate(
          fromUser.full_name,
          toUser.full_name,
          payload.content || "Depoimento não disponível"
        );
        break;

      case "referral":
        subject = `📞 ${fromUser.full_name} indicou um contato para você!`;
        html = referralEmailTemplate(
          fromUser.full_name,
          toUser.full_name,
          payload.contact_name || "Contato",
          payload.contact_phone,
          payload.contact_email,
          payload.notes
        );
        break;

      case "welcome":
        subject = `🎉 Bem-vindo ao Gente Networking, ${toUser.full_name}!`;
        html = welcomeEmailTemplate(toUser.full_name);
        break;

      case "invitation_accepted":
        subject = `🎉 Seu convite foi aceito! ${payload.new_member_name} entrou na comunidade`;
        html = invitationAcceptedEmailTemplate(
          toUser.full_name,
          payload.new_member_name || "Novo membro"
        );
        break;

      case "guest_attended":
        subject = `🎉 Seu convidado ${payload.guest_name} compareceu a um encontro!`;
        html = guestAttendedEmailTemplate(
          toUser.full_name,
          payload.guest_name || "Convidado",
          payload.meeting_title || "Encontro da comunidade"
        );
        break;

      default:
        return new Response(JSON.stringify({ success: false, reason: "unknown_type" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    console.log("Sending email to:", toUser.email);
    const result = await sendEmail(toUser.email, subject, html);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
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