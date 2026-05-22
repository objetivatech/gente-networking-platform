## Objetivo

Permitir que um admin faça o **downgrade seguro de um membro para convidado** quando ele pede saída do Gente, preservando todo o histórico (pontos, presenças, indicações, depoimentos, negócios, cases, Gente em Ação) e removendo-o do grupo, sem quebrar nenhuma feature existente.

## Diagnóstico do estado atual

- `deactivate_member` (admin-only) já existe: remove de `team_members` e marca `is_active=false`. Isso **esconde** o membro, mas mantém role original — não é downgrade.
- `promote_guest_to_member` já existe e troca roles com segurança, mas só faz upgrade (convidado → membro/facilitador).
- Convidados são vinculados ao grupo via `invitations.team_id` (não em `team_members`), conforme regra v3.7.0.
- Pontuação atual do mês é recalculada por `update_all_monthly_points_for_user`, que itera por `team_members`. Se removermos o membro de `team_members`, o recálculo do mês corrente passa a render 0 — correto para o futuro, mas precisamos preservar o histórico já gravado em `monthly_points` e `points_history` (são imutáveis por RLS, então estão seguros).
- Convidados não pontuam pelo `calculate_user_points` (retorna 0 para role `convidado`? não — só bloqueia admin/facilitador). Pontos passados em `monthly_points` permanecem visíveis no ranking histórico.

## Plano

### 1. Nova RPC `downgrade_member_to_guest(_member_id, _reason)`

`SECURITY DEFINER`, admin-only. Em uma única transação:

1. Validar que o caller é `admin` (via `has_role`).
2. Validar que `_member_id` tem role `membro` ou `facilitador` (não permitir downgrade de admin nem de quem já é convidado).
3. Capturar `team_id` atual (primeiro grupo em `team_members`) para snapshot.
4. `DELETE FROM team_members WHERE user_id = _member_id` (remove de todos os grupos).
5. `DELETE FROM user_roles WHERE user_id = _member_id` + `INSERT (_member_id, 'convidado')`.
6. Garantir que existe um registro em `invitations` para preservar vínculo histórico:
   - Se já existe convite aceito, atualizar `team_id` para o último grupo conhecido e adicionar `metadata.downgraded_at`, `metadata.downgrade_reason`, `metadata.previous_role`.
   - Se não existe (caso raro de membro original sem convite), inserir um convite sintético `status='accepted'`, `accepted_by=_member_id`, `invited_by=auth.uid()` (admin), `code=gen_random_uuid()`, com `metadata.synthetic=true`.
7. Marcar perfil: manter `is_active=true` (ele continua existindo como convidado), mas gravar `metadata`/campos de auditoria via `add_activity_feed('member_downgrade', ...)`.
8. Recalcular `monthly_points` do mês corrente para zerar pontuação ativa do membro nos grupos que ele deixou (chamada a `update_all_monthly_points_for_user` após o DELETE — vai inserir/atualizar com 0).
9. Retornar `jsonb` com `success`, `previous_role`, `previous_team_id`, `teams_removed`.

### 2. Preservação de histórico — verificações explícitas

Antes de implementar, validar (apenas leitura) que nenhuma das tabelas abaixo tem FK ou trigger que apague dados ao remover de `team_members` ou trocar role:

- `gente_em_acao`, `testimonials`, `referrals`, `business_deals`, `business_cases`, `council_posts`, `council_replies`, `attendances`, `points_history`, `monthly_points`, `activity_feed`.

Nenhuma delas tem FK para `team_members` ou `user_roles` (confirmado pelo schema). Histórico fica intacto.

### 3. Reversão (retorno do ex-membro)

Reaproveitar `promote_guest_to_member(_guest_id, 'membro', _team_id)` já existente — funciona sem mudanças, pois detecta role atual `convidado` e promove de volta. Documentar esse fluxo como o caminho oficial de retorno.

### 4. UI em `GerenciarMembros.tsx`

Adicionar um terceiro botão na linha de membros ativos: **"Tornar Convidado"** (ícone `UserMinus`, cor âmbar — distinto de "Desativar" destrutivo).

- Dialog de confirmação explica: "O membro será removido do grupo, perderá acesso de membro e voltará a ser convidado. O histórico será preservado e ele pode ser promovido novamente no futuro."
- Campo opcional de motivo.
- Chama `supabase.rpc('downgrade_member_to_guest', ...)`.
- Invalida queries: `admin-members`, `members-directory`, `guests-directory`, `teams`, `monthly-ranking`.
- Toast de sucesso indicando o grupo de origem.

Botão aparece apenas para membros com role `membro` ou `facilitador` (não para `admin`, não para quem já é `convidado`).

### 5. Matriz de permissões e proteção contra regressão

Em `src/lib/access-control.ts`:

```ts
export const canDowngradeMember = (role: AppRole): boolean => role === 'admin';
```

Em `src/lib/__tests__/access-control.test.ts`: adicionar testes para `canDowngradeMember` (admin sim; facilitador, membro, convidado, null não).

Novo teste em `src/hooks/__tests__/` mockando Supabase para garantir que o botão chama `rpc('downgrade_member_to_guest')` e não faz `UPDATE` direto em `user_roles` ou `DELETE` em `team_members` pelo cliente.

### 6. Linter Supabase

Rodar `supabase--linter` após a migração e corrigir qualquer warning introduzido pela nova função.

### 7. Documentação e changelog

- `docs/INVITATION_FLOW.md`: nova seção "Downgrade de membro para convidado" explicando fluxo, preservação de histórico e caminho de retorno via `promote_guest_to_member`.
- `docs/TECHNICAL_DOCUMENTATION.md`: documentar a RPC, regras de acesso e impacto em pontuação.
- `.lovable/memory/access-control/permission-matrix.md`: adicionar regra `canDowngradeMember = admin-only`.
- Nova memória `.lovable/memory/features/member-downgrade-to-guest.md` com o contrato da RPC, snapshot em `invitations.metadata` e regra de preservação de histórico.
- `system_changelog`: inserir versão **v3.10.0** categoria `feature` descrevendo o downgrade seguro com preservação de histórico.

### 8. Validação final

- `bun run test` — todos os testes de access-control + hooks devem passar.
- Teste manual no preview:
  1. Admin faz downgrade de um membro → some das listagens de membros, aparece em `/convidados`, histórico de pontos do mês anterior continua no ranking histórico.
  2. Admin promove o mesmo usuário de volta via `/convidados` → volta como membro do grupo escolhido.
  3. Convidado e membro comuns **não** veem o botão de downgrade.

## Resultado esperado

- Admin tem um caminho oficial e seguro para registrar a saída de um membro sem perder dado nenhum.
- Membro vira convidado: perde acesso de membro, sai do grupo, mas continua no sistema com todo o histórico.
- Retorno é um clique (promover convidado de volta para membro).
- Nenhuma feature existente é tocada: o fluxo usa a RPC dedicada e segue o padrão já estabelecido por `promote_guest_to_member` e `deactivate_member`.
- Matriz de permissões + testes automatizados protegem contra regressões futuras.
