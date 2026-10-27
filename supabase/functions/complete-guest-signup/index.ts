/**
 * Cadastro instantâneo do convidado: cria a conta já confirmada, aceita o
 * convite e confirma presença no próximo encontro do Grupo, sem 2º e-mail.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  code: z.string().trim().min(4).max(64),
  full_name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().regex(/^\d{10,11}$/),
  company: z.string().trim().min(1).max(150),
  business_segment: z.string().trim().min(1).max(150),
  password: z.string().min(6).max(72),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }, 400);
    const input = parsed.data;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows } = await admin.rpc("get_invitation_by_code", { _code: input.code });
    const inv = Array.isArray(rows) ? rows[0] : null;
    if (!inv || inv.status !== "pending" || new Date(inv.expires_at) <= new Date()) {
      return json({ error: "invalid_invitation" }, 410);
    }
    if (inv.invite_purpose === "whatsapp_community") return json({ error: "invalid_invitation" }, 410);
    if (inv.email && String(inv.email).toLowerCase().trim() !== input.email) {
      return json({ error: "email_mismatch" }, 409);
    }

    const { data: existing } = await admin.from("profiles").select("id").ilike("email", input.email).maybeSingle();
    if (existing) return json({ error: "email_exists" }, 409);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name,
        phone: input.phone,
        company: input.company,
        business_segment: input.business_segment,
        invitation_code: inv.code,
      },
    });
    if (createError || !created.user) {
      const msg = createError?.message ?? "";
      if (/already|registered|exists/i.test(msg)) return json({ error: "email_exists" }, 409);
      console.error("createUser failed", msg);
      return json({ error: "signup_failed" }, 500);
    }
    const userId = created.user.id;

    // Garante o aceite (o gatilho de cadastro normalmente já o fez).
    const { data: accepted } = await admin
      .from("invitations").select("id").eq("id", inv.id).eq("accepted_by", userId).maybeSingle();
    if (!accepted) {
      const { data: acc, error: accErr } = await admin.rpc("accept_invitation", { _code: inv.code, _user_id: userId });
      if (accErr || (acc && acc.success === false)) console.error("accept_invitation", accErr?.message ?? acc);
    }

    const { data: confirmation, error: confErr } = await admin.rpc("confirm_guest_next_meeting", { _user_id: userId });
    if (confErr) console.error("confirm_guest_next_meeting", confErr.message);

    return json({ success: true, meeting: confirmation?.meeting ?? null });
  } catch (error) {
    console.error("complete-guest-signup", error);
    return json({ error: "internal_error" }, 500);
  }
});
