---
name: Guests Directory Page
description: Página /convidados (v3.6.0) e aba "Convidados em Encontros" em /encontros formam o banco de consulta de leads. /convidados lista convidados ativos por status; aba em /encontros mostra histórico completo (passados+futuros, todos os grupos) com contato clicável e link de perfil. Acessível a admin, facilitador e membro.
type: feature
---

A rota `/convidados` é o diretório público de convidados ativos:
- Roles: `admin`, `facilitador`, `membro`. Convidados são redirecionados para `/`.
- Hook `useGuestsDirectory` agrega profiles + user_roles + invitations + team_members + attendances.
- 3 status: `awaiting_first` (sem attendances), `attended` (1+), `promoted` (role atual já promovido).
- Cada card tem link "Ver perfil" (`/membro/:slug`) e, para admin/facilitador, botão "Gerenciar" abrindo `/admin/pessoas`.
- Filtros: busca, grupo, status, toggle "mostrar promovidos".

A aba "Convidados em Encontros" em `/encontros` (hook `useGuestsAttendanceHistory`) é um histórico completo:
- Inclui encontros passados E futuros, de TODOS os grupos.
- Inclui usuários já promovidos que entraram originalmente como convidados (badge "membro" + flag `is_promoted`).
- Cada card de convidado: avatar, empresa, segmento, email clicável (mailto:), WhatsApp clicável (wa.me/), quem convidou, link "Ver perfil".
- Filtros: busca livre, grupo, período (todos/próximos/anteriores).
- Objetivo: banco de consulta para reativação de leads e follow-up direto.

Em `/equipes`, convidados ficam SEMPRE em seção separada via `useTeams` que expõe `member_type: 'facilitator' | 'member' | 'guest'`.

`useUpcomingMeetingGuests` foi mantido como alias deprecated de `useGuestsAttendanceHistory`.
