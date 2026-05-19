---
name: Access Control Matrix
description: Matriz central de permissões em src/lib/access-control.ts com testes de regressão Vitest. Funções nomeadas (canViewGuestsDirectory, canManageGuests, etc.) padronizam decisões de acesso para evitar bugs como o da v3.9.0 (membros deixaram de ver /convidados).
type: feature
---

Toda regra crítica de acesso deve passar por `src/lib/access-control.ts` e ter teste em `src/lib/__tests__/access-control.test.ts`. Hooks que dependem de role devem usar RPCs `SECURITY DEFINER` no Supabase quando a RLS da tabela base for restritiva (ex.: `get_guests_directory`). Rodar `bun run test` antes de fechar mudanças sensíveis.

Funções disponíveis:
- `canViewGuestsDirectory(role)` — admin, facilitador, membro
- `canManageGuests(role)` — admin, facilitador
- `canViewMembersDirectory(role)` — admin, facilitador, membro
- `canAccessAdminArea(role)` — admin, facilitador
- `isAdminOnly(role)` — admin
