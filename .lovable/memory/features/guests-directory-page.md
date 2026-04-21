---
name: Guests Directory Page
description: Página /convidados (v3.6.0) lista todos os convidados ativos da comunidade, agrupados por status (aguardando primeiro encontro / participou / promovido). Acessível a admin, facilitador e membro. Convidados não veem.
type: feature
---

A rota `/convidados` é o diretório público de convidados:
- Visível para roles: `admin`, `facilitador`, `membro`. Convidados são redirecionados para `/`.
- Hook: `useGuestsDirectory` agrega profiles + user_roles + invitations + team_members + attendances.
- 3 status derivados: `awaiting_first` (sem attendances), `attended` (1+ attendances), `promoted` (role atual já é membro/facilitador/admin).
- Filtros: busca, grupo, status, toggle "mostrar promovidos".
- Sem ações destrutivas — promover/transferir continua em `/admin/pessoas`.

Em `/equipes`, convidados ficam SEMPRE em seção separada (nunca misturados com membros). Hook `useTeams` expõe `member_type: 'facilitator' | 'member' | 'guest'` para classificação à prova de erro.

Em `/encontros`, há aba auxiliar "Convidados em Encontros" listando convidados confirmados nos próximos eventos (hook `useUpcomingMeetingGuests`).
