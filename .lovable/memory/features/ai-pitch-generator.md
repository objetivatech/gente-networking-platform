---
name: AI Pitch Generator
description: Gerador de Pitch via IA no Perfil — edge function generate-pitch usa Lovable AI Gateway (gemini-3-flash) para criar texto de apresentação a partir dos campos do perfil.
type: feature
---

Recurso "Gerador de Pitch via IA" disponível na aba "Sobre" do Perfil (`src/pages/Profile.tsx` via `src/components/PitchGenerator.tsx`).

- Botão "Gerar Pitch" chama a edge function `generate-pitch` (`supabase.functions.invoke`).
- A edge function (`supabase/functions/generate-pitch/index.ts`, `verify_jwt = true`) recebe os dados do perfil (nome, empresa, cargo, segmento, bio, o que faço, cliente ideal, como me indicar, tags) e chama o Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`, modelo `google/gemini-3-flash-preview`) usando `LOVABLE_API_KEY` (servidor).
- Retorna `{ pitch }` em PT-BR (3-5 frases, ~120 palavras). Trata 429 (limite) e 402 (créditos) com mensagens claras.
- UI mostra o texto em Textarea editável com botões "Gerar novamente" e "Copiar". Aviso para completar o perfil quando faltam campos.
- Sem alterações de schema. Não interfere em gamificação/MatchMaking/CRM.
