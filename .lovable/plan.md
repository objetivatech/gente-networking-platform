

## Análise: Convidados misturados com Membros + falta de banco de convidados

### Diagnóstico

**Estado atual no banco (correto):**
- Existem 24 convidados (`role = 'convidado'`) corretamente vinculados a `team_members` no grupo certo. Exemplo Gente Conecte: 3 convidados (Alan Garcez, João Barbi, Lucas Voss) + 13 membros + 1 facilitador.
- A separação por `role` funciona — o problema é exclusivamente de **apresentação visual**.

**Onde está o erro de UI:**

1. **`/equipes` → `Membros.tsx`** (rota usada hoje): já filtra convidados via `useMembers` e mostra só membros. **OK.**
2. **`Equipes.tsx`** (página legada, ainda no bundle, acessível via menu/link antigo): separa apenas por `is_facilitator`. Resultado: convidados aparecem na seção "Membros" com só um badge pequeno "Convidado". **É a fonte da confusão relatada.**
3. **`/admin/pessoas` → `GestaoPessoas.tsx`** (visão de facilitador): tem aba "Convidados" separada, mas o usuário relata ver convidados na visão de "membros do grupo". O facilitador acessa `Equipes.tsx`/legado e vê tudo junto.

**Banco de convidados que já passaram pelo Gente:**
- Não existe hoje uma página acessível a **membros comuns** para consultar convidados históricos. Só admin/facilitador veem em `/admin/pessoas` ou `/admin/convidados`.
- O usuário quer que **todo membro** possa consultar essa base (rede de leads que passaram pela comunidade).

---

## Plano de Correção

### 1. Reformar `Equipes.tsx` — separação rigorosa em 3 seções

A página de Grupos (visualização compartilhada) terá 3 listas distintas dentro de cada card de grupo:

```text
[Grupo Gente Conecte]
├── 👑 Facilitadores (1)         ← borda âmbar
├── ✅ Membros (13)              ← apenas role = 'membro'
└── 🎟️ Convidados (3)            ← apenas role = 'convidado', fundo distinto, badge claro
```

Mudanças concretas:
- Substituir filtro `is_facilitator` por **3 grupos**: facilitadores (`is_facilitator = true`), membros (`role = 'membro' && !is_facilitator`), convidados (`role = 'convidado'`).
- Cada seção com título, ícone e contador próprios.
- Convidados em card com fundo âmbar/secundário, badge "Convidado" obrigatório, sem RankBadge (convidados não pontuam).
- Card de estatísticas no topo passa a mostrar 4 números: Grupos | Membros | Facilitadores | **Convidados**.

### 2. Corrigir `useTeams` — devolver role e tipo separados

O hook hoje retorna `role` mas o componente ignora ao classificar. Vamos:
- Garantir que `role` venha sempre populado (se ausente, default `'membro'` é incorreto para órfãos — usar `null` explícito).
- Adicionar campo derivado `member_type: 'facilitator' | 'member' | 'guest'` para deixar o consumo trivial e à prova de erro.

### 3. Nova página pública de Convidados — `/convidados`

Acessível a **todos os membros autenticados** (admin, facilitador, membro — convidados não veem).

Conteúdo:
- Lista todos os usuários com `role = 'convidado'` (ativos), agrupados por **status de jornada**:
  - **Aguardando primeiro encontro** (cadastrou, sem `attendances`)
  - **Já participou de encontro** (tem ao menos 1 `attendance`)
  - **Promovido a membro** (toggle para mostrar histórico — usuários que eram convidados e viraram membros, identificados via `invitations.accepted_by` + role atual `membro`/`facilitador`)
- Cada card mostra: nome, empresa, foto, grupo de origem, quem convidou, data do convite, encontros que participou.
- Filtros: busca por nome/empresa, grupo, status.
- Sem ações (só leitura) — para promover/transferir, segue a porta `/admin/pessoas` (admin/facilitador).

Hook novo: `src/hooks/useGuestsDirectory.ts` — query consolidada (profiles + user_roles + invitations + team_members + attendances).

### 4. Aba "Convidados" na página de Encontros

Conforme pedido, dentro de `/encontros` adicionar uma aba auxiliar mostrando os **convidados confirmados em encontros futuros** organizados por encontro. Estrutura:

```text
/encontros
├── Tab "Encontros" (atual, default)
└── Tab "Convidados em Encontros"
    └── Para cada encontro futuro com convidado confirmado:
        - Nome do encontro + data + grupo
        - Lista de convidados confirmados (nome, empresa, quem convidou)
```

Visível para admin/facilitador/membro (convidados continuam vendo só sua própria visão).

### 5. Navegação (Sidebar + BottomNav)

Adicionar item "Convidados" no Sidebar para roles `admin`, `facilitador`, `membro`, ícone `UserPlus` ou `Ticket`, rota `/convidados`. Não adicionar ao BottomNav (espaço limitado, usuário acessa via menu lateral).

### 6. Ajustes em `Membros.tsx` e `MembersByTeam`

Já filtra convidados — confirmar e adicionar comentário JSDoc explícito reforçando a regra. Sem alteração de lógica.

### 7. Documentação

- **Atualizar `docs/INVITATION_FLOW.md`**: adicionar seção "Visualização de Convidados" descrevendo as 3 superfícies (Grupos, /convidados, /encontros aba) e quem vê o quê.
- **Atualizar `docs/USER_FLOWS.md`**: incluir fluxo "Membro consulta base de convidados".
- **Atualizar `docs/TECHNICAL_DOCUMENTATION.md`**: registrar nova rota `/convidados` e nova aba em `/encontros`.
- **Criar entrada no `system_changelog`** versão `v3.6.0`, categoria `improvement`:
  - Separação rigorosa de Convidados, Membros e Facilitadores na página Grupos
  - Nova página `/convidados` para todos os membros
  - Nova aba "Convidados em Encontros" em `/encontros`
  - Documentação atualizada

### 8. Memória do projeto

Atualizar:
- `mem://access-control/member-directory-visibility-and-branding` — incluir regra "Em /equipes (Grupos), Convidados ficam em seção separada, não misturados com Membros".
- Criar `mem://features/guests-directory-page` — nova página pública de convidados, regras de acesso, dados expostos.

---

### Esquema final de visibilidade (após correção)

| Superfície | Quem vê | O que mostra |
|------------|---------|--------------|
| `/equipes` (Grupos) | admin, facilitador, membro | 3 seções por grupo: Facilitadores, Membros, Convidados |
| `/membros` | admin, facilitador, membro | Apenas membros e facilitadores (nunca convidados) |
| `/convidados` (NOVO) | admin, facilitador, membro | Diretório de todos os convidados ativos da comunidade |
| `/encontros` aba Convidados (NOVO) | admin, facilitador, membro | Convidados confirmados nos próximos encontros |
| `/admin/pessoas` aba Convidados | admin, facilitador | Gestão completa: promover, transferir, desativar |
| `/` (GuestWelcome) | convidado | Eventos do grupo do convite + perfil |

### Arquivos afetados

- `src/pages/Equipes.tsx` — refatoração visual (3 seções)
- `src/hooks/useTeams.ts` — campo `member_type` derivado
- `src/pages/Convidados.tsx` (novo) — diretório público
- `src/hooks/useGuestsDirectory.ts` (novo) — query consolidada
- `src/pages/Encontros.tsx` — adicionar Tabs com aba "Convidados em Encontros"
- `src/hooks/useMeetings.ts` — exportar helper para listar convidados confirmados em encontros futuros
- `src/components/layout/Sidebar.tsx` — novo item de menu
- `src/App.tsx` — rota `/convidados`
- Migration: `INSERT INTO system_changelog` para v3.6.0
- `docs/INVITATION_FLOW.md`, `docs/USER_FLOWS.md`, `docs/TECHNICAL_DOCUMENTATION.md`
- `mem://access-control/member-directory-visibility-and-branding`, `mem://features/guests-directory-page`

