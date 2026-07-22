---
name: v3.27.0 — PWA + CRM + Contratos
description: Identidade Comunidade/Networking nos assets, popup PWA reaparece em 2 dias e some após appinstalled, exportação PDF na auditoria com filtros de data/status, badge de contrato no Kanban, versionamento restaurável de modelos de contrato e RPC reassign_contract_template
type: feature
---
- Logos: `public/logo-gente*.png` atualizados (Comunidade cor/branco no app interno, Networking cor/branco em contexto público). `src/assets/hero-networking-gente.png.asset.json` disponível para uso em heros.
- `PWAInstallPrompt`: retorna em 2 dias após "Agora não" (`pwa-banner-dismissed`), some para sempre após `appinstalled` ou `display-mode: standalone`. Copy interno "Instale o Gente Comunidade".
- `AdminCrmAuditoria`: novos filtros `from_status`, `to_status`, `date_from`, `date_to`; exportação PDF via `jspdf` + `jspdf-autotable` com resumo dos filtros aplicados; CSV mantido.
- `AdminCrm` Kanban: `ContractBadge` colorido (Enviado/Assinado/Rejeitado/Expirado) exibido no card, junto do ícone HUB e Crown.
- Modelos de contrato: nova `ContractVersionsDialog` (restaurar versão anterior gerando nova entrada), nova `ReassignTemplateDialog` (bulk reatribuir template a leads elegíveis).
- Migration v3.27: índices em `crm_lead_history` (created_at, event_type) + RPC `reassign_contract_template(_template_id, _version, _lead_ids)` admin-only. RPC nunca sobrescreve contratos `sent` ou `signed`; grava evento `contract_template_reassigned` em `crm_lead_history`.
- `useContractTemplates`: `useRestoreContractVersion`, `useReassignContractTemplate` novos hooks.
