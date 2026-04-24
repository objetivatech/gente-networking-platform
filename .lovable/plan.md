## Objetivo

Garantir separação rigorosa entre **Membros** e **Convidados** em toda a UI, e refletir no banco a regra de negócio: **convidados não pertencem a grupo algum** — apenas são vinculados a encontros específicos via `attendances`. Só após promoção a membro é que entram em `team_members`.

---

## Diagnóstico atual

| Local | Problema |
|---|---|
| `/encontros` aba "Convidados em Encontros" | `useGuestsAttendanceHistory` inclui usuários **promovidos** que entraram como convidados (flag `is_promoted`). Mistura ex-convidados (hoje membros) com convidados ativos. |
| `/membros` aba "Grupos" (`GruposTab`) | Filtra apenas por `is_facilitator`, não por role. Como convidados estão em `team_members`, aparecem na lista de "Membros" do grupo (com badge "Convidado", mas dentro da seção de membros). |
| `/admin` (Gestão do Grupo do Facilitador) → aba Grupos → cards de cada grupo | `team.members.map(...)` renderiza tudo junto. Convidados aparecem misturados com membros, sem seção separada. |
| Banco | `accept_invitation()` insere convidado em `team_members`. Isso é a raiz do problema: convidado fica como "membro do grupo" no banco. |

---

## Plano

### 1. Banco — desvincular convidados de `team_members`

Convidados **não devem** estar em `team_members`. Para preservar a regra "convidado só vê eventos do grupo de quem o convidou", vamos usar `invitations.team_id` (já existe e já é populado em `accept_invitation`) e o snapshot `metadata.allowed_team_ids` (já existe).

**Migração:**
1. Remover de `team_members` todos os `user_id` que possuem role `convidado` (sem promoção). Backup garantido pelos campos `invitations.team_id` e `metadata.allowed_team_ids`.
2. Atualizar a função `accept_invitation()` para **não** mais inserir em `team_members` quando role = `convidado`. Continua atualizando `invitations.team_id` e `metadata.allowed_team_ids`.
3. Atualizar `transfer_guest_to_team()` para transferir via `invitations.team_id` em vez de `team_members` (já atualiza ambos hoje; passa a operar **só** em invitations para guests).
4. Atualizar `promote_guest_to_member()`: ao promover, **inserir** em `team_members` (já faz, mas hoje pode estar duplicado). Garantir comportamento.
5. Atualizar funções que dependem disso:
   - `calculate_monthly_points_for_team`: a checagem "EXISTS team_members tm" para o convidador continua válida (membro/inviter sempre está em team_members). Não muda.
   - `handle_guest_attendance_insert`: já filtra por role; sem mudança.
   - RLS de `team_members` "Facilitadores podem adicionar convidados à sua equipe": **revogar** essa policy de INSERT (não faz mais sentido).

### 2. Hook `useGuestData` / leitura do grupo do convidado

Atualmente o convidado lê seu(s) grupo(s) via `team_members` ou `metadata.allowed_team_ids`. Após a mudança, passa a ler **exclusivamente** via `invitations.team_id` ou `metadata.allowed_team_ids`. Verificar `useGuestData.ts` e ajustar.

### 3. Hook `useTeams` — não retornar convidados

Mudar o hook para **excluir** usuários com role `convidado` do array `team.members`. Como após a migração não haverá mais convidados em `team_members`, o filtro vira defensivo (segurança). O campo derivado `member_type` continua existindo, mas só assumirá valores `facilitator` ou `member`.

### 4. UI — aba "Grupos" em `/membros` (`GruposTab`)

Já passa a receber apenas membros/facilitadores via `useTeams`. Remover lógica de badge "Convidado" (não é mais possível). Renomear contadores para refletir só membros.

### 5. UI — `/admin` "Gestão do Grupo" (Facilitador) — aba Grupos

Refatorar o card de cada grupo para 3 seções separadas (mesmo padrão de `/equipes`):
- **Facilitadores** (borda âmbar)
- **Membros** (estilo padrão)
- **Convidados ativos do grupo** — buscados via novo hook (não de `team_members`):
  - Convidados cuja `invitations.team_id = team.id`, `status = 'accepted'`, role atual = `convidado`.
  - Card mostra nome, empresa, avatar, e ações: **Promover a Membro**, **Transferir** (já existem como hooks `usePromoteGuest` / `useTransferGuest`).

Criar hook `useTeamGuests(teamId)` que retorna esses convidados.

### 6. UI — aba "Convidados em Encontros" em `/encontros`

Filtrar `useGuestsAttendanceHistory` para retornar **apenas** convidados ativos (role atual = `convidado`). Remover a inclusão de `cameInAsGuest` para promovidos. Remover badge "promovido".

Manter contato clicável, link "Ver perfil", filtros por grupo/período, busca.

### 7. Documentação e changelog

- Atualizar `docs/INVITATION_FLOW.md`: nova regra "convidado não está em team_members".
- Atualizar `docs/TECHNICAL_DOCUMENTATION.md` e `docs/USER_FLOWS.md`.
- Atualizar `mem://features/guest-visibility-snapshots`, `mem://features/guests-directory-page`, `mem://features/invitation-system`.
- Inserir versão `v3.7.0` em `system_changelog`.

---

## Arquivos afetados

**Backend (migration):**
- `supabase/migrations/<timestamp>_separate_guests_from_teams.sql`
  - DELETE de convidados em team_members
  - UPDATE `accept_invitation()`
  - UPDATE `transfer_guest_to_team()`
  - DROP policy "Facilitadores podem adicionar convidados à sua equipe" em team_members
  - INSERT changelog v3.7.0

**Frontend:**
- `src/hooks/useTeams.ts` — filtrar role `convidado`
- `src/hooks/useGuestData.ts` — ler grupo via invitations
- `src/hooks/useMeetings.ts` — `useGuestsAttendanceHistory` apenas role atual = convidado
- `src/hooks/useTeamGuests.ts` (novo) — lista convidados de um grupo via invitations
- `src/pages/Membros.tsx` — `GruposTab` sem lógica de convidado
- `src/pages/Equipes.tsx` — manter 3 seções, mas agora seção convidados vem de `useTeamGuests`
- `src/pages/Admin.tsx` — refatorar card de grupo em 3 seções
- `src/pages/Encontros.tsx` — UI da aba sem badge "promovido"

**Docs/memória:**
- `docs/INVITATION_FLOW.md`, `docs/TECHNICAL_DOCUMENTATION.md`, `docs/USER_FLOWS.md`
- `.lovable/memory/features/guests-directory-page.md`
- `.lovable/memory/features/guest-visibility-snapshots.md`
- `.lovable/memory/features/invitation-system.md`

---

## Resultado esperado

1. ✅ Aba "Convidados em Encontros" mostra **apenas** convidados ativos (role = convidado).
2. ✅ Aba "Grupos" em `/membros` lista **apenas** membros e facilitadores.
3. ✅ "Gestão do Grupo" do facilitador exibe 3 seções claras: Facilitadores, Membros, Convidados (estes vindo de invitations, não de team_members).
4. ✅ Convidados não estão em `team_members` — só são associados a um grupo via invitation. Ao serem promovidos, são inseridos em `team_members`.