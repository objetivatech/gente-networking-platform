

## Plano: Correção de Roles Ausentes + Auditoria de Contadores

### Diagnóstico Confirmado

**Dados reais do banco**:
- Roles existentes: admin=1, facilitador=2, membro=31
- Perfis sem role: 22
  - **17 aceitaram convite** → deveriam ter role `convidado`
  - **5 sem convite** → contas criadas manualmente (teste ou cadastro direto)
- Causa raiz: a função `accept_invitation` **não atribui** a role `convidado` ao novo usuário

Os 5 perfis sem convite:
1. Diogo Devitte (inativo) — provável teste
2. ABEL ANSELMO GREGO — cadastro direto
3. Lucas Voss Martins — duplicata (já existe Lucas Voss com convite)
4. Joao Henrique Barbi — duplicata (já existe João Barbi com convite)
5. Ricardo Marçal — cadastro direto

---

### Correções

#### 1. Migration SQL — Corrigir `accept_invitation` para atribuir role `convidado`

```sql
CREATE OR REPLACE FUNCTION accept_invitation(...)
  -- Após aceitar o convite, inserir role 'convidado' se não existir
  INSERT INTO user_roles (user_id, role) VALUES (_user_id, 'convidado')
  ON CONFLICT (user_id, role) DO NOTHING;
```

#### 2. Migration SQL — Atribuir role `convidado` aos 17 perfis existentes sem role que aceitaram convite

```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'convidado'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id)
AND EXISTS (SELECT 1 FROM invitations i WHERE i.accepted_by = p.id AND i.status = 'accepted');
```

#### 3. Corrigir contadores em todos os hooks

**`useAdminDashboard.ts`**:
- Linha 37: `totalMembers` conta `profiles WHERE is_active=true` (52) → Filtrar por `user_roles IN ('membro','facilitador')` para obter contagem real de membros (33)
- Linha 88-91: `totalActiveMembers` no `attendanceKpis` usa mesma query errada → Corrigir
- Linha 176: `rankDistribution` conta todos os perfis → Filtrar por roles válidas

**`useStats.ts` — `useCommunityStats`**:
- Linha 102: `profiles.select('id, rank')` sem filtro de role → Filtrar por `membro`/`facilitador`
- Linha 171: `totalMembers: profilesData.length` → Será automaticamente correto após filtro

**`useStats.ts` — `useAdminGlobalStats`**:
- Linha 202: busca todos os perfis → Filtrar por roles válidas

**Padrão aplicado em cada hook**:
```typescript
const { data: validRoles } = await supabase
  .from('user_roles')
  .select('user_id')
  .in('role', ['membro', 'facilitador']);
const validMemberIds = new Set(validRoles?.map(r => r.user_id) || []);
// Filtrar profiles por validMemberIds
```

#### 4. Adicionar KPI de Convidados no Admin Dashboard

Além de "Membros Ativos", exibir:
- **Convidados Ativos**: profiles com role `convidado` e `is_active=true`
- **Convites Pendentes**: invitations com status `pending` e não expirados
- **Convites Expirados**: invitations com status `expired` ou `expires_at < now()`

---

### Ordem de Execução

1. Migration SQL: corrigir `accept_invitation` + atribuir roles aos 17 perfis sem role
2. Corrigir `useAdminDashboard.ts` — totalMembers, attendanceKpis, rankDistribution
3. Corrigir `useStats.ts` — useCommunityStats e useAdminGlobalStats
4. Adicionar KPIs de convidados no AdminDashboard

