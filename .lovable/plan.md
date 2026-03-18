

## Plano: Corrigir Duplicidades e Lógica de Convidados

### Problema Raiz

**1. Duplicidades no Feed**: Cada trigger está registrado DUAS vezes na tabela `attendances`:
- `on_attendance_insert` + `trigger_attendance_insert` → ambos chamam `handle_attendance_insert`
- `on_guest_attendance_insert` + `trigger_guest_attendance_insert` → ambos chamam `handle_guest_attendance_insert`
- Mesmo padrão nos triggers de DELETE

Resultado: cada presença gera 2 entradas de "Presença" + 2 entradas de "Convidado no Encontro" = 4 registros no feed ao invés de no máximo 2.

**2. Membros tratados como Convidados**: O trigger `handle_guest_attendance_insert` verifica apenas se o usuário tem um convite aceito (`invitations.accepted_by`), mas NÃO verifica se o usuário ainda tem a role `convidado`. Igor Brelaz foi promovido a `membro`, mas como ele tem um convite antigo na tabela `invitations`, o trigger continua o tratando como convidado.

**3. Pontuação indevida**: A mesma lógica falha está em `calculate_monthly_points_for_team` — a seção "Convites aceitos com presença" (15 pts) não verifica a role atual do usuário convidado.

---

### Correções (1 migration SQL)

**A. Remover triggers duplicados**:
```sql
DROP TRIGGER IF EXISTS trigger_attendance_insert ON attendances;
DROP TRIGGER IF EXISTS trigger_attendance_delete ON attendances;
DROP TRIGGER IF EXISTS trigger_guest_attendance_insert ON attendances;
```

**B. Corrigir `handle_guest_attendance_insert`**: Adicionar verificação de que o usuário que está confirmando presença AINDA possui a role `convidado` e NÃO possui `membro`, `admin` ou `facilitador`:
```sql
-- Só dispara se o usuário tem role 'convidado' e NÃO tem roles internas
IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role = 'convidado')
   AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role IN ('membro','admin','facilitador'))
THEN ...
```

**C. Corrigir `calculate_monthly_points_for_team`**: Na seção "Convites aceitos com presença" (15 pts), adicionar a mesma verificação — só contar se o `accepted_by` ainda tem role `convidado`:
```sql
AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = a.user_id AND ur.role = 'convidado')
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = a.user_id AND ur.role IN ('membro','admin','facilitador'))
```

**D. Limpar dados duplicados existentes**: Remover os registros duplicados do `activity_feed` mantendo apenas o mais antigo de cada par, e remover os `guest_attendance` indevidos (onde o usuário já é membro).

---

### Ordem de Execução

1. Migration SQL com todas as correções (A, B, C, D)
2. Recalcular pontos mensais para corrigir pontuações indevidas
3. Sem alterações no frontend — os labels já estão corretos

