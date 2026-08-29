---
name: Auditoria de identidade única (v3.47.0)
description: Abas de fusões/bloqueios e métricas em /admin/crm/auditoria, crm_identity_events, sincronização de páginas de captação e snippet 409 para LPs
type: feature
---
- Bloqueios `409 already_member` do `submit-lead` são gravados em `crm_identity_events` via RPC `crm_log_identity_block` (chamada não bloqueante, nunca impede a resposta à LP).
- `/admin/crm/auditoria`: cartões de métricas (bloqueios e fusões em 7/30 dias e total) + abas **Eventos**, **Fusões de contatos** (`lead_merged`) e **Bloqueios na origem**. Hooks em `src/hooks/useCrmIdentity.ts`.
- Páginas de captação: auto-descoberta continua; botão "Sincronizar páginas" usa `crm_register_known_page` (leads_count = 0) para LPs já publicadas; páginas sem lead mostram "sem conversões ainda".
- Trechos para as LPs (JS, Elementor, React) em `docs/LP_SNIPPET_409.md` — as LPs devem tratar 409 como sucesso de fluxo com link `login_url`.
- Regressões cobertas por `src/lib/identity-utils.ts` + `src/lib/__tests__/identity-utils.test.ts` (convite, visibilidade de convidado, desativação, dedupe).
