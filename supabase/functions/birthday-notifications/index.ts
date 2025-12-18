import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Gente Networking <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const { data: birthdayUsers, error: birthdayError } = await supabase
      .from('profiles')
      .select('id, full_name, email, birthday')
      .not('birthday', 'is', null);

    if (birthdayError) throw birthdayError;

    const todayBirthdays = birthdayUsers?.filter(user => {
      if (!user.birthday) return false;
      const bday = new Date(user.birthday + 'T00:00:00');
      const bdayMonthDay = `${String(bday.getMonth() + 1).padStart(2, '0')}-${String(bday.getDate()).padStart(2, '0')}`;
      return bdayMonthDay === monthDay;
    }) || [];

    for (const birthdayUser of todayBirthdays) {
      if (birthdayUser.email) {
        await sendEmail(
          birthdayUser.email,
          "🎂 Feliz Aniversário!",
          `<div style="font-family: Arial, sans-serif;"><h1 style="color: #8B5CF6;">🎉 Feliz Aniversário, ${birthdayUser.full_name}!</h1><p>A comunidade Gente Networking deseja a você um dia repleto de alegrias!</p></div>`
        );
      }

      const { data: teamMembership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', birthdayUser.id)
        .single();

      if (teamMembership?.team_id) {
        const { data: teammates } = await supabase
          .from('team_members')
          .select('user_id, is_facilitator, profiles(email, full_name)')
          .eq('team_id', teamMembership.team_id)
          .neq('user_id', birthdayUser.id);

        for (const teammate of teammates || []) {
          const profile = teammate.profiles as any;
          if (profile?.email) {
            await sendEmail(
              profile.email,
              `🎂 Aniversário: ${birthdayUser.full_name}`,
              `<div style="font-family: Arial, sans-serif;"><h1>🎂 Lembrete de Aniversário</h1><p>Olá ${profile.full_name}, hoje é aniversário de <strong>${birthdayUser.full_name}</strong>!</p></div>`
            );
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, birthdaysProcessed: todayBirthdays.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
