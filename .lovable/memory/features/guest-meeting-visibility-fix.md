---
name: guest-meeting-visibility-fix
description: Guest could not see/confirm meetings because invitations RLS lacked an accepted_by SELECT policy (fixed v3.13.0)
type: feature
---

# Correção: convidado não via os encontros (v3.13.0)

## Causa raiz
A tabela `invitations` só tinha policies de SELECT para `invited_by` (convidador) e admin.
Não existia policy permitindo o **convidado** (`accepted_by = auth.uid()`) ler o próprio convite.

`useGuestData.ts` lê `invitations` por `accepted_by` para resolver `metadata.allowed_team_ids`.
Sem leitura → `allowedTeamIds = []` → a query `guest-meetings` retorna vazio → `GuestWelcome` mostra "Nenhum encontro agendado". O convidado nunca conseguia confirmar presença.

## Correção
Policy adicionada em `invitations`:
```sql
CREATE POLICY "Convidados podem ver convite aceito"
ON public.invitations FOR SELECT TO authenticated
USING (auth.uid() = accepted_by);
```

## Notas importantes
- Convidados NÃO entram em `team_members`. Vínculo de grupo é via `invitations.team_id` + `metadata.allowed_team_ids` (snapshot). Funciona tanto para convite por facilitador quanto por membro (RPC `accept_invitation` resolve `team_id`, com fallback para o 1º grupo do convidador).
- `meetings` e `attendances` já têm SELECT para `authenticated`, então a visibilidade dos encontros depende apenas do `allowed_team_ids` resolvido pelo hook.
