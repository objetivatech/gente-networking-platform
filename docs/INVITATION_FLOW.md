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

## Arquivos Chave

- `src/hooks/useInvitations.ts` — criação e listagem
- `src/hooks/useTransferGuest.ts` — transferência
- `src/hooks/usePromoteGuest.ts` — promoção
- `src/pages/Convites.tsx` — UI de convites (com Select de grupo obrigatório)
- `src/pages/GestaoPessoas.tsx` — UI admin/facilitador
- `src/pages/GuestWelcome.tsx` — landing do convidado
- `src/pages/AuthConfirm.tsx` — processa confirmação de email
