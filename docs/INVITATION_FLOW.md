# Fluxo de Convites — Gente Networking

> Última atualização: 2026-04-18

## Visão Geral

O sistema de convites é a porta de entrada de leads para a comunidade. Cada convite é vinculado **explicitamente a um grupo** escolhido pelo convidador. Ao ser aceito, o convidado:
- Recebe a role `convidado`
- É inserido em `team_members` no grupo do convite
- Passa a ver apenas os encontros desse grupo

## Diagrama do Fluxo

```text
[Membro/Facilitador]
        │ cria convite (escolhe GRUPO obrigatório)
        ▼
┌─────────────────────────┐
│ invitations (pending)   │ ← email opcional disparado via Resend
│ team_id: X              │
└──────────┬──────────────┘
           │ link /convite/CODE
           ▼
[Convidado abre link]
           │
           ├── Cadastro via /convite/CODE  ──┐
           │   (invitation_code → metadata)  │
           │                                 │
           └── Cadastro direto via /auth ────┤
               (trigger handle_new_user_     │
                invitation_match faz match   │
                automático por email)        │
                                             ▼
                                    ┌────────────────┐
                                    │ /auth/confirm  │
                                    │ chama RPC      │
                                    └────────┬───────┘
                                             ▼
                          ┌──────────────────────────────────┐
                          │ accept_invitation:               │
                          │ • status = accepted              │
                          │ • role = convidado               │
                          │ • team_members += (user, team_id)│
                          │ • activity_feed                  │
                          └──────────┬───────────────────────┘
                                     ▼
                       [Convidado vê eventos do grupo X]
                                     │
        ┌────────────────────────────┼───────────────────────────┐
        ▼                            ▼                           ▼
[Transferir grupo]          [Promover a membro]         [Manter convidado]
transfer_guest_to_team   promote_guest_to_member        (sem ação)
```

## Estados do Convite

| Status      | Descrição                                          | Gatilho                                              |
|-------------|----------------------------------------------------|------------------------------------------------------|
| `pending`   | Aguardando aceite                                  | INSERT na tabela `invitations`                       |
| `accepted`  | Convidado se cadastrou e o convite foi processado  | RPC `accept_invitation` (manual ou trigger)          |
| `expired`   | Passou de 30 dias sem aceite                       | Comparação `expires_at < now()` (frontend)           |

## Roles e Transições

| Role         | Como obter                                                          |
|--------------|---------------------------------------------------------------------|
| `convidado`  | `accept_invitation` atribui automaticamente                         |
| `membro`     | RPC `promote_guest_to_member(_target_role := 'membro')`             |
| `facilitador`| RPC `promote_guest_to_member(_target_role := 'facilitador')` (admin)|
| `admin`      | Inserção manual em `user_roles` via SQL                             |

> Constraint UNIQUE (`user_id`) em `user_roles` garante 1 role por usuário.

## RPCs Envolvidas

### `accept_invitation(_code, _user_id)`
- **Quem chama**: frontend (`AuthConfirm.tsx`) ou trigger `handle_new_user_invitation_match`
- **Permissão**: SECURITY DEFINER (sem checagem de role; código como prova de autorização)
- **Efeitos**:
  1. Marca convite como `accepted`
  2. Atribui role `convidado` (se sem role)
  3. Insere em `team_members` com o `team_id` do convite
  4. Cria entrada em `activity_feed`

### `transfer_guest_to_team(_guest_id, _new_team_id)`
- **Quem pode**:
  - Admin: qualquer convidado para qualquer grupo
  - Facilitador: só convidados do **próprio grupo**
- **Efeitos**:
  1. Remove de `team_members` antigo
  2. Insere no novo grupo
  3. Atualiza `invitations.team_id` e `metadata.allowed_team_ids`
  4. Cria entrada em `activity_feed`

### `promote_guest_to_member(_guest_id, _target_role, _team_id)`
- **Efeitos**: Remove role `convidado`, atribui nova role, opcionalmente vincula a um grupo.

## Trigger `handle_new_user_invitation_match`

- **Tabela**: `auth.users` AFTER INSERT
- **Lógica**: Se o email do novo usuário bate com um convite `pending` válido, executa `accept_invitation` automaticamente.
- **Resolve**: Caso de cadastro direto via `/auth` sem link `/convite/CODE`.

## Match Retroativo por Email

Sempre que um novo usuário se cadastra (via `/auth` ou `/convite/CODE`), o trigger procura convites pendentes com email matching e os aceita. Isso garante que **nenhum convite fica órfão** quando o usuário se cadastra fora do fluxo do link.

## Transferência de Grupo

Facilitadores frequentemente precisam mover convidados quando percebem que o perfil não se encaixa no grupo. A UI em `/admin/pessoas` (aba Convidados) tem o botão `ArrowRightLeft` ao lado do "Promover", abrindo um modal com lista de grupos disponíveis.

## Visualização de Convidados (v3.6.0)

A separação entre Convidados e Membros é **rigorosamente visual** em todas as superfícies:

| Superfície | Quem vê | O que mostra |
|------------|---------|--------------|
| `/equipes` (Grupos) | admin, facilitador, membro | 3 seções por grupo: Facilitadores, Membros, Convidados |
| `/membros` | admin, facilitador, membro | Apenas membros e facilitadores (nunca convidados) |
| `/convidados` | admin, facilitador, membro | Diretório de todos os convidados ativos da comunidade, agrupados por status (aguardando / participou / promovido) |
| `/encontros` aba Convidados | admin, facilitador, membro | Convidados confirmados nos próximos encontros |
| `/admin/pessoas` aba Convidados | admin, facilitador | Gestão completa: promover, transferir, desativar |
| `/` (GuestWelcome) | convidado | Eventos do grupo do convite + perfil |

### Hook `useTeams` — campo `member_type`
Cada participante de um grupo expõe `member_type: 'facilitator' | 'member' | 'guest'`, derivado de `is_facilitator` + `role`. Isso garante que nenhuma tela classifique convidados como membros por engano.

## Arquivos Chave

- `src/hooks/useInvitations.ts` — criação e listagem
- `src/hooks/useTransferGuest.ts` — transferência
- `src/hooks/usePromoteGuest.ts` — promoção
- `src/hooks/useGuestsDirectory.ts` — diretório consolidado de convidados
- `src/hooks/useMeetings.ts` — `useUpcomingMeetingGuests` para aba de Convidados em Encontros
- `src/pages/Convites.tsx` — UI de convites (com Select de grupo obrigatório)
- `src/pages/Convidados.tsx` — diretório público de convidados
- `src/pages/Equipes.tsx` — Grupos com 3 seções rigorosamente separadas
- `src/pages/Encontros.tsx` — Tabs com aba "Convidados em Encontros"
- `src/pages/GestaoPessoas.tsx` — UI admin/facilitador
- `src/pages/GuestWelcome.tsx` — landing do convidado
- `src/pages/AuthConfirm.tsx` — processa confirmação de email


---

## v3.7.0 — Separação rigorosa Convidado vs Membro

**Regra de negócio:** convidados NÃO pertencem a grupos. O vínculo com o grupo do inviter existe apenas via `invitations.team_id` (e snapshot `metadata.allowed_team_ids`). Só ao serem promovidos a membro entram em `team_members`.

**Mudanças:**
- `accept_invitation()` não insere mais convidados em `team_members`.
- `transfer_guest_to_team()` opera apenas em `invitations.team_id`.
- DELETE retroativo: convidados pré-existentes foram removidos de `team_members`.
- Policy "Facilitadores podem adicionar convidados à sua equipe" em `team_members` foi revogada.

**UI:**
- `/encontros` aba "Convidados em Encontros": apenas convidados ativos (role atual = `convidado`).
- `/membros` aba "Grupos": apenas Membros e Facilitadores.
- `/admin` Gestão do Grupo: cards com 3 seções separadas (Facilitadores / Membros / Convidados via `useTeamGuests`), com ações Promover a Membro e Transferir Grupo.
