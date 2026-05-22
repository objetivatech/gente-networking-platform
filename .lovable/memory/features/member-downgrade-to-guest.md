---
name: member-downgrade-to-guest
description: Admin-only RPC that downgrades a member/facilitator to convidado, preserving all history
type: feature
---

# Downgrade de membro para convidado (v3.10.0)

Quando um membro pede saída do Gente, o admin deve rebaixá-lo a convidado em vez de desativar/excluir, para preservar histórico e permitir retorno futuro.

## RPC

`public.downgrade_member_to_guest(_member_id uuid, _reason text)` — `SECURITY DEFINER`, admin-only.

Fluxo:
1. Valida `has_role(auth.uid(), 'admin')`.
2. Bloqueia se role atual for `admin` ou `convidado`.
3. Captura `previous_team_id` (primeiro grupo em `team_members`).
4. `DELETE FROM team_members WHERE user_id = _member_id`.
5. Substitui `user_roles` por `'convidado'`.
6. Garante convite aceito em `invitations`:
   - Existente: atualiza `team_id` e grava `metadata.downgraded_at`, `metadata.previous_role`, `metadata.downgrade_reason`, `metadata.allowed_team_ids`.
   - Inexistente: cria convite sintético com `metadata.synthetic=true`.
7. Recalcula `monthly_points` do mês corrente (vira 0 — sem mais grupo).
8. Log em `activity_feed` com tipo `member_downgrade`.

## Preservação de histórico

Nenhuma das tabelas abaixo tem FK para `team_members` ou `user_roles`, então removendo o membro da equipe e trocando a role **não apaga nada**:
- `gente_em_acao`, `testimonials`, `referrals`, `business_deals`, `business_cases`
- `council_posts`, `council_replies`
- `attendances`, `monthly_points`, `points_history`, `activity_feed`

## Retorno

Reaproveitar `promote_guest_to_member(_guest_id, 'membro', _team_id)` na tela `/convidados`.

## Acesso

- `canDowngradeMember(role)` em `src/lib/access-control.ts` — apenas `admin`.
- UI: botão "Tornar Convidado" em `/admin/membros` (aba Ativos), visível só para linhas com role `membro` ou `facilitador`.

## Regressão

Coberto por `src/lib/__tests__/access-control.test.ts` (suite "downgrade de membro para convidado").
