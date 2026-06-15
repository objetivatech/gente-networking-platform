/**
 * generate-pitch - Gerador de Pitch via IA (Lovable AI Gateway).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Recebe os dados do perfil do membro e gera um texto curto de apresentação
 * profissional (pitch) em PT-BR, ideal para encontros 1x1 e networking.
 * Usa o Lovable AI Gateway (google/gemini-3-flash-preview) com a
 * LOVABLE_API_KEY mantida no servidor.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PitchProfile {
  full_name?: string;
  company?: string;
  position?: string;
  business_segment?: string;
  bio?: string;
  what_i_do?: string;
  ideal_client?: string;
  how_to_refer_me?: string;
  tags?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as { profile?: PitchProfile };
    const profile = body?.profile;

    if (!profile || typeof profile !== "object") {
      return new Response(
        JSON.stringify({ error: "Dados do perfil ausentes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tags = Array.isArray(profile.tags) ? profile.tags.filter(Boolean).join(", ") : "";

    const profileText = [
      profile.full_name && `Nome: ${profile.full_name}`,
      profile.position && `Cargo: ${profile.position}`,
      profile.company && `Empresa: ${profile.company}`,
      profile.business_segment && `Segmento: ${profile.business_segment}`,
      profile.bio && `Bio: ${profile.bio}`,
      profile.what_i_do && `O que faço: ${profile.what_i_do}`,
      profile.ideal_client && `Cliente ideal: ${profile.ideal_client}`,
      profile.how_to_refer_me && `Como me indicar: ${profile.how_to_refer_me}`,
      tags && `Tags/Habilidades: ${tags}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!profileText.trim()) {
      return new Response(
        JSON.stringify({ error: "Perfil sem informações suficientes para gerar o pitch." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt =
      "Você é um especialista em networking e comunicação de negócios. " +
      "Gere um pitch de apresentação profissional curto e envolvente, em português do Brasil, " +
      "na primeira pessoa, com 3 a 5 frases (máximo ~120 palavras). " +
      "O texto deve soar natural para ser falado em um encontro 1x1 de networking, " +
      "destacar o que a pessoa faz, o valor que entrega e o cliente ideal/como pode ser indicada. " +
      "Não use emojis, hashtags, marcadores ou títulos. Retorne apenas o texto do pitch.";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados do perfil:\n${profileText}` },
        ],
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Não foi possível gerar o pitch no momento." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResponse.json();
    const pitch = data?.choices?.[0]?.message?.content?.trim();

    if (!pitch) {
      return new Response(
        JSON.stringify({ error: "Resposta vazia da IA." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ pitch }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-pitch error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao gerar o pitch." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
