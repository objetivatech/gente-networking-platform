---
name: v3.26.0 Contratos + Cobrança HUB + Menu
description: Modelos de contrato configuráveis (contract_templates), envio Autentique com placeholders/prévia, cobrança HUB idempotente (hub_billing_events) com retry e marcação manual, timeline expandida, menu lateral em grupos colapsáveis com persistência
type: feature
---

**Contratos gerenciáveis** — `contract_templates` (admin em `/admin/contratos`), `send-contract` renderiza `{{placeholder}}` e salva `contract_signing_url`, `contract_template_id/version/variables` em `crm_leads`. Modelos versionados via trigger.

**Cobrança HUB** — `hub_billing_events` + `dispatch-hub-billing` idempotente (bloqueia duplicata, aceita `force_retry`), `useMarkLeadPaid` para pagamento manual com motivo obrigatório. Cada evento logado em `hub_billing_events` + `crm_lead_history`.

**Drawer** — badge de contrato (not_sent/sent/signed/rejected/expired), botão de reenvio quando rejeitado/expirado, link direto de assinatura Autentique, `HubBillingPanel` inline para HUB.

**Menu** — 6 grupos colapsáveis (`Início`, `Comunidade`, `Networking`, `Desempenho`, `Conhecimento`, `Administração`). Auto-abre grupo da rota ativa. Estado persistido em `localStorage` (`gente:sidebar-groups:v1`). Novo item: **Modelos de Contrato** (admin).

**Eventos de auditoria** adicionados: `contract_rejected`, `contract_expired`, `hub_billing_failed`, `payment_paid_manual`.
