---
name: Public Profile & v3.19.0 adjustments
description: Página pública /p/:slug, gating de publicação/cartão, logo no cartão, notificações de Pedido de Indicação e legenda do Health Score
type: feature
---
# v3.19.0 — Ajustes e Página Pública do Perfil

## Item 1 — Cartão Digital com logo
- `DigitalMemberCard.tsx` desenha `/public/logo-gente-card.png` (logo oficial enviado) no canvas, com fallback para marca em texto.
- O QR Code agora aponta para a página pública `/p/:slug` (antes `/membro/:slug`).

## Item 2 — Health Score (get_members_health_scores)
- A RPC está correta (retorna 24 membros para admin). O bloco vazio era falta de tratamento de erro/estado desabilitado no frontend.
- `MemberHealthScoreCard.tsx`: estados de erro e "exclusivo para admin"; popover (Info) com a legenda dos pesos.
- Pesos: Reunião 15, Indicação 15, Presença 20, Depoimento 10, Case 10, Conselho 5. Níveis: Saudável ≥60, Atenção 30-59, Risco <30. Não afeta gamificação.

## Item 3 — Notificações de Pedido de Indicação
- Trigger `on_referral_request_insert` → insere no `activity_feed` (activity_type `referral_request`) com `team_id` do autor.
- `send-notification` ganhou o tipo `referral_request` (batch) + template `referralRequestEmailTemplate`; envia email a TODOS os membros do mesmo grupo.
- `useReferralRequests.ts` chama `get_group_members_for_notification(user_id)` e invoca a função.
- `ActivityFeed.tsx`: ícone Search para `referral_request`.

## Item 4 — Página Pública do Perfil
- Rota pública `/p/:slug` (`PublicProfile.tsx`), fora do MainLayout, identidade Gente (cabeçalho/rodapé) + CTA para `/auth?tab=signup`.
- Dados via RPC `get_public_profile` (SECURITY DEFINER, anon) — só retorna perfis com `public_profile_enabled = true`.
- `public_profile_enabled` em `profiles`; toggle em `PublicProfilePublishControl.tsx`.
- Completude em `src/lib/profile-completeness.ts` (obrigatórios: foto, nome, empresa, cargo, segmento, bio, o que faço, cliente ideal, como me indicar). Publicação e geração do cartão só liberam com perfil 100% completo; tooltips indicam campos faltantes.
- `Auth.tsx` abre aba "Cadastrar" com `?tab=signup`.
