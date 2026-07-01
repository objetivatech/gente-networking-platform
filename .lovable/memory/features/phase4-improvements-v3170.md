---
name: Phase 4 — Cartão Digital + Agenda 1x1 (v3.17.0)
description: Fase 4 do plano de melhorias. Cartão de visita digital com QR Code (Item 6) e Agenda 1x1 via Google Calendar/.ics (Item 2). Item 10 (OAuth) removido do escopo.
type: feature
---

# Fase 4 — v3.17.0

## Item 6 — Cartão Digital de Membro
- Componente `src/components/DigitalMemberCard.tsx` desenha um cartão em `<canvas>` (Navy #1E3A5F / Orange #F7941D) com nome, cargo/empresa, segmento, contatos e um QR Code (lib `qrcode`) apontando para `${origin}/membro/:slug` (fallback `/membro/:id`).
- Download em PNG via `canvas.toDataURL`.
- Exposto na aba **Cartão** em `MemberProfile.tsx` e após o Pitch em `Profile.tsx` (perfil próprio).

## Item 2 — Agenda 1x1
- `src/lib/scheduling-utils.ts`: gera URL do Google Calendar e conteúdo/download de `.ics`. Sem OAuth externo — apenas convite de calendário local.
- `src/components/ScheduleMeetingDialog.tsx`: diálogo com data/hora, duração e local; botões "Google Calendar" e "Baixar .ics". Título do evento = "Gente em Ação (1x1) — {membro}".
- Botão **Agendar 1x1** aparece no `MemberProfile.tsx` apenas para perfis de terceiros (não no próprio).
- Novo campo de perfil `availability_note` (coluna TEXT em `profiles`) editável em `Profile.tsx` e exibido no diálogo de agendamento.

## Notas
- Nenhuma pontuação nova é atribuída (agendar 1x1 não pontua; o registro de Gente em Ação continua sendo feito pelo fluxo existente).
- Item 10 (OAuth Google + LinkedIn) foi removido do escopo a pedido do usuário.
- Dependência adicionada: `qrcode` + `@types/qrcode`.
