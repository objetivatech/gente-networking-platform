

## Plano Conciso — 3 Frentes

### 1. Corrigir visibilidade de encontros para convidados

**Problema**: A maioria dos convites aceitos tem `allowed_team_ids: []` vazio. O inviter principal (Eduardo, admin) não está em nenhum grupo, então o fallback também falha — resultado: convidados veem zero encontros.

**Correção**:
- **Migration SQL (INSERT/UPDATE via insert tool)**: Backfill `allowed_team_ids` nos convites aceitos com snapshot vazio. Para o admin (Eduardo), usar TODOS os grupos. Para inviters com grupos, usar os grupos atuais. Para inviters sem grupos, usar todos os grupos como fallback.
- **useGuestData.ts**: Adicionar fallback final — se `allowedTeamIds` continuar vazio após tentar metadata e inviter teams, buscar todos os grupos disponíveis (o convidado ao menos verá os encontros gerais).

### 2. Facilitadores poderem promover convidados a membros

**Problema**: RLS em `user_roles` só permite `admin` fazer INSERT/UPDATE. Facilitadores recebem erro ao tentar promover.

**Correção**:
- **Migration SQL**: Criar função RPC `promote_guest_to_member` com `SECURITY DEFINER` que:
  - Valida que o chamador é admin OU facilitador
  - Facilitador só pode promover para `membro` (não para `facilitador`)
  - Facilitador só pode promover convidados que pertencem aos seus grupos (via convite/attendance)
  - Atualiza/insere role + adiciona ao grupo do facilitador
- **usePromoteGuest.ts**: Trocar operações diretas na tabela por chamada RPC
- **GestaoPessoas.tsx**: Facilitador vê apenas opção "Membro" (não "Facilitador") no dropdown de promoção; grupo pre-selecionado como o grupo do facilitador
- **RLS em team_members**: Já permite facilitador fazer INSERT no seu grupo (policy existente)

### 3. Documentação e Changelog

- Inserir novo registro no `system_changelog` via insert tool
- Atualizar `docs/TECHNICAL_DOCUMENTATION.md` e `docs/USER_FLOWS.md` com as mudanças

### Detalhes Técnicos

**RPC `promote_guest_to_member`**:
```sql
CREATE FUNCTION promote_guest_to_member(
  _guest_id UUID, 
  _target_role app_role DEFAULT 'membro',
  _team_id UUID DEFAULT NULL
) RETURNS jsonb
SECURITY DEFINER
-- Valida caller é admin ou facilitador
-- Facilitador: só pode promover para 'membro', e só convidados
-- Atualiza user_roles (upsert)
-- Adiciona ao team_members se _team_id fornecido
```

**Backfill dos allowed_team_ids** (via insert tool):
- Convites do Eduardo (admin sem grupo): atribuir todos os 3 grupos
- Convites de inviters com grupo: atribuir os grupos do inviter
- Convites de inviters sem grupo e sem role admin: atribuir todos os grupos

### Ordem de Execução

1. Backfill `allowed_team_ids` nos convites existentes
2. Criar RPC `promote_guest_to_member`
3. Atualizar `usePromoteGuest.ts` para usar RPC
4. Ajustar `GestaoPessoas.tsx` para facilitadores (limitar opções)
5. Inserir changelog + atualizar docs

### Arquivos Impactados

- `supabase/migrations/` — nova migration para RPC
- `src/hooks/usePromoteGuest.ts` — trocar por RPC
- `src/pages/GestaoPessoas.tsx` — ajustar UI para facilitador
- `src/hooks/useGuestData.ts` — fallback para todos os grupos
- `docs/TECHNICAL_DOCUMENTATION.md`, `docs/USER_FLOWS.md`

