---
name: Perfil interno do membro — compartilhamento e correções v3.42.0
description: Botão de compartilhar/pedir preenchimento em /membro/:slug, link público canônico /m/:slug, redirect de visitantes e correções de RichText e layout do cabeçalho
type: feature
---
# v3.42.0 — Perfil do membro (visão interna)

- `ShareOrNudgeProfile.tsx`: botão laranja no topo de `/membro/:slug`.
  - Publicado (`public_profile_enabled` + completude de `profile-completeness.ts`) → "Compartilhar perfil público" com URL `origin + /m/<slug>`.
  - Não publicado → "Pedir para completar o perfil": diálogo com campos faltantes + mensagem opcional; envia `send-notification` tipo `profile_completion_request` (template `profileCompletionRequestEmailTemplate`).
  - Próprio perfil sem página → "Publicar minha página" (`/perfil`).
- `MainLayout`: visitante sem login em `/membro/:slug` é redirecionado para `/m/:slug`; página pública indisponível leva a `/auth?tab=signup`.
- Aba **Sobre** usa `RichText` (antes mostrava HTML cru).
- Cabeçalho: avatar + selo de rank + pontos em coluna única (`-mt-20/-mt-24`), sem sobreposição; empilha no mobile.
