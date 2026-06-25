# Correção do fluxo de convites — convidado não vê encontros

## Diagnóstico (revisão ponta a ponta)

Fluxo verificado:
1. **Criação do convite** — `invitations` recebe `team_id` do grupo escolhido (facilitador ou membro). ✅ OK
2. **Cadastro do convidado** (`CadastroConvidado.tsx` / `/auth/confirm`) — funciona. ✅
3. **Aceite** — RPC `accept_invitation` resolve `team_id` (fallback p/ 1º grupo do inviter), grava `metadata.allowed_team_ids`, atribui role `convidado`. Convidado **não** entra em `team_members` (correto). ✅
4. **Exibição dos encontros** (`useGuestData.ts` → `GuestWelcome.tsx`) — ❌ **FALHAVA AQUI**

### Causa raiz
A tabela `invitations` **não tinha política RLS de SELECT para o convidado**. As policies existentes só permitiam:
- `auth.uid() = invited_by` (quem convidou)
- admins

Como `useGuestData` lê `invitations` por `accepted_by = auth.uid()`, o convidado recebia `null` → `allowedTeamIds = []` → nenhum encontro exibido.

Caso real confirmado: Anna Ferreira (code `L846SD3B`), grupo Gente Impulso, com `allowed_team_ids` correto e encontro futuro em 2026-07-01 — mas invisível por causa da RLS.

## Correção aplicada (migration já executada)
Nova policy em `invitations`:
```sql
CREATE POLICY "Convidados podem ver convite aceito"
ON public.invitations FOR SELECT TO authenticated
USING (auth.uid() = accepted_by);
```
Com isso o convidado lê o próprio convite, resolve `allowed_team_ids` e passa a ver/confirmar os encontros do grupo. `meetings` e `attendances` já têm SELECT para `authenticated`.

## Pendências (requer build mode)
- `docs/INVITATION_FLOW.md`: corrigir drift (dizia que convidado entra em `team_members`; na verdade NÃO entra) e documentar a nova policy RLS.
- `.lovable/memory/features/`: registrar correção do acesso do convidado aos encontros.
- `system_changelog`: nova entrada **v3.13.0 — Correção do acesso de convidados aos encontros**.
