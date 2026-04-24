---
name: Guests Directory Page
description: v3.7.0 — Convidados são totalmente separados de Membros. Não pertencem a team_members; vínculo a grupo só via invitations.team_id. Aba "Convidados em Encontros" em /encontros lista APENAS convidados ativos. Aba "Grupos" em /membros lista APENAS membros/facilitadores. Em /admin (Gestão do Grupo) cards de grupo têm 3 seções: Facilitadores, Membros, Convidados (vindos de invitations).
type: feature
---

**v3.7.0 — separação rigorosa Membro vs Convidado**

- Convidados NÃO estão em `team_members`. O vínculo com o grupo do inviter é exclusivamente via `invitations.team_id` (+ snapshot `metadata.allowed_team_ids`).
- `accept_invitation()` não insere mais em `team_members`.
- `transfer_guest_to_team()` opera apenas em `invitations`.
- `promote_guest_to_member()` é o único caminho para o usuário entrar em `team_members`.
- Policy "Facilitadores podem adicionar convidados à sua equipe" foi revogada.

**UI:**
- `/encontros` aba "Convidados em Encontros" (`useGuestsAttendanceHistory`) — apenas role atual = `convidado`. Sem badge "promovido".
- `/membros` aba "Grupos" (`GruposTab` via `useTeams`) — `useTeams` filtra defensivamente `role !== 'convidado'`. Mostra apenas Membros e Facilitadores.
- `/admin` Gestão do Grupo — card de cada grupo tem 3 seções separadas: Facilitadores (âmbar), Membros, Convidados (laranja, vindos de `useTeamGuests` via invitations) com ações Promover e Transferir.
- `/equipes` — segue 3 seções (já estava assim em v3.6.0).
- `/convidados` — diretório público de convidados ativos por status, inalterado.

**Hooks:**
- `useTeamGuests(teamId)` (novo): convidados ativos de um grupo via invitations aceitos.
- `useGuestsAttendanceHistory`: histórico apenas de convidados ativos.
- `useTeams`: exclui convidados de `team.members`.
