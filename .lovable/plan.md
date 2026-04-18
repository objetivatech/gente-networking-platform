

## Análise: Fluxo de Convites — Problemas Identificados

### Estado atual do banco
- **75 convites totais**: 54 aceitos, 21 pendentes
- Dos 21 pendentes, **1 já tem perfil cadastrado** (Helder Mesquita — `info@heldermesquita.pt`) mas o convite continua "pending"
- **20 emails de convite SEM perfil correspondente** (pessoas que receberam mas nunca se cadastraram — comportamento correto)
- **26 usuários com role `convidado`**: nenhum está vinculado a um grupo (`team_id NULL`), o que torna impossível para o convidado ver eventos do grupo correto

### Problemas confirmados

**P1 — Convite "pendente" mesmo após cadastro (caso Helder)**
O usuário Helder se cadastrou via `/auth` (página normal de signup) usando o email do convite, ao invés de usar o link `/convite/QBM3482Y`. Resultado: o `accept_invitation` nunca foi chamado porque não havia código no fluxo. Hoje, **não existe** match automático por email no momento do cadastro.

**P2 — Convidados sem grupo associado**
Quando o convite é aceito, `accept_invitation` salva `allowed_team_ids` no metadata do convite (snapshot dos grupos do inviter), mas **NÃO insere o convidado em `team_members`**. Por isso, em `GestaoPessoas` todos os 26 convidados aparecem sem nenhum grupo. A página `GuestWelcome` mostra eventos via metadata (funciona), mas a gestão visual fica quebrada.

**P3 — Inviter sem grupo = convidado sem visibilidade**
Hoje `accept_invitation` faz snapshot dos grupos do inviter no momento do aceite. Se o inviter pertence a múltiplos grupos (ex.: admin do Master + Conecte), o convidado herda todos. Não há **escolha explícita do grupo no momento do convite**, o que torna impossível garantir "se inviter é do Master, convidado vê só Master".

**P4 — Não existe transferência de grupo**
Facilitadores não têm UI nem RPC para mover um convidado de um grupo para outro. O snapshot em `metadata.allowed_team_ids` é imutável depois do aceite.

**P5 — Convites sem email não conseguem disparar notificação por email**
14 dos 21 convites pendentes têm `email = NULL` (criados só com nome). Nenhum email automático foi enviado.

---

## Plano de Correção

### 1. Adicionar `team_id` à tabela `invitations`
Coluna nova `team_id uuid` (nullable, FK lógica para `teams`). No momento de criar o convite, o membro/facilitador **escolhe explicitamente o grupo** ao qual o convidado será atribuído. Default: primeiro grupo do inviter.

### 2. Reformar `accept_invitation` (RPC)
Após aceitar:
- Inserir o usuário em `team_members` com `team_id` do convite (não snapshot de todos os grupos)
- Salvar `allowed_team_ids = [team_id]` no metadata (apenas o grupo escolhido)
- Manter atribuição da role `convidado`
- Disparar `add_activity_feed` no grupo correto

### 3. Match retroativo por email no cadastro normal (`/auth`)
Adicionar trigger `handle_new_user_invitation_match` em `auth.users` (após inserção): se o email do novo usuário bate com um convite `pending`, executa `accept_invitation` automaticamente. Resolve casos como o Helder.

### 4. Nova RPC `transfer_guest_to_team`
Função SECURITY DEFINER com checks de permissão:
- Admin: pode mover qualquer convidado para qualquer grupo
- Facilitador: pode mover convidados do **seu** grupo para outro grupo (ou receber convidados de outros grupos somente se o admin permitir — versão simples: facilitador pode mover apenas para fora do seu grupo)

Operação: remove de `team_members` antigo, insere no novo, atualiza `invitations.team_id` e `metadata.allowed_team_ids`.

### 5. UI — Convites (`/convites`)
- Modal "Novo Convite": adicionar `<Select>` obrigatório de grupo (carrega `teams` que o inviter pertence; admin vê todos)
- Listagem: mostrar badge do grupo escolhido em cada convite

### 6. UI — Gestão de Pessoas (`/admin/pessoas`)
- Aba Convidados: passar a mostrar o grupo do convidado (vindo de `team_members`, agora preenchido)
- Botão novo "Transferir Grupo" (ícone `ArrowRightLeft`) ao lado do botão "Promover" → abre modal com `<Select>` de grupos → chama `transfer_guest_to_team`
- Filtro por grupo já existe e funcionará corretamente após a correção

### 7. UI — GuestWelcome (`/`)
- Já lê `allowed_team_ids` do metadata; vai funcionar automaticamente após correção (1 grupo só)
- Header passa a exibir "Convidado para o grupo X" em destaque

### 8. Migração retroativa
- Para os 26 convidados existentes sem `team_id`: ler `metadata.allowed_team_ids` do convite aceito; se houver pelo menos um, inserir em `team_members` com o primeiro
- Para o convite do Helder e outros pendentes com perfil já criado: executar `accept_invitation` retroativamente

### 9. Documentação
Criar `docs/INVITATION_FLOW.md` com:
- Diagrama ASCII do fluxo completo (criação → email → cadastro → aceite → atribuição de grupo → promoção)
- Tabela de estados do convite (`pending` / `accepted` / `expired`) e gatilhos
- Tabela de roles e transições (`convidado` → `membro` / `facilitador`)
- Lista de RPCs envolvidas e suas permissões
- Seção "Transferência de Grupo" e "Match Retroativo por Email"

Atualizar também `docs/USER_FLOWS.md` (seção convidados) e `docs/TECHNICAL_DOCUMENTATION.md` (seção banco de dados — coluna nova).

### 10. Memória do projeto
Atualizar `mem://features/invitation-system` e `mem://features/guest-visibility-snapshots` com a nova regra: convite vincula explicitamente a 1 grupo, não snapshot dos grupos do inviter.

---

### Esquema do Fluxo Completo (após correção)

```text
[Membro/Facilitador]
        │ cria convite (escolhe GRUPO)
        ▼
┌─────────────────────────┐
│ invitations (pending)   │ ← email opcional disparado
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
               (match por email no trigger)  │
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

### Arquivos afetados
- **Migration SQL**: nova coluna, RPC reformada, RPC nova de transferência, trigger de match por email, dados retroativos
- `src/pages/Convites.tsx` — Select de grupo no modal
- `src/hooks/useInvitations.ts` — aceitar `team_id` no `createInvitation`
- `src/pages/GestaoPessoas.tsx` — botão "Transferir Grupo" + modal
- `src/hooks/useTransferGuest.ts` — novo hook
- `src/hooks/useGuestData.ts` — sem mudança de lógica (já lê metadata)
- `docs/INVITATION_FLOW.md` — novo
- `docs/USER_FLOWS.md`, `docs/TECHNICAL_DOCUMENTATION.md` — atualizações
- `mem://features/invitation-system`, `mem://features/guest-visibility-snapshots` — atualizações

