---
name: Identidade única de leads (v3.46.0)
description: submit-lead bloqueia membros ativos na origem (409 already_member), dedupe por e-mail OU telefone normalizado e união automática de leads via crm_merge_leads
type: feature
---
- Colunas geradas `phone_digits` (últimos 11 dígitos) em `crm_leads` e `profiles`, com índices por telefone e `lower(email)`.
- `submit-lead`:
  - Se e-mail OU telefone bate com perfil **ativo** com papel membro/facilitador/admin → responde `409` `{ ok:false, already_member:true, message, login_url }`. Nenhum lead, convite ou convidado é criado. A LP deve mostrar a mensagem + login (não tratar como erro).
  - Dedupe busca leads não arquivados por e-mail OU `phone_digits`; mantém o mais antigo e une os demais.
  - E-mail principal do card é preservado; e-mails diferentes vão para `metadata.alt_emails`.
- RPC `crm_merge_leads(_keep_id,_dup_id,_reason)` (SECURITY DEFINER, só service_role): transfere `meeting_lead_attendances`, `billing_subscriptions`, `billing_charges`, `hub_billing_events`, `rescue_dispatches` e `crm_lead_history`; arquiva o duplicado (`archived_at`, status `perdido`, `metadata.merged_into`) — nunca apaga — e grava evento `lead_merged` na auditoria.
- Decisões do cliente: bloqueio na origem; chave telefone OU e-mail; mescla automática com histórico.
