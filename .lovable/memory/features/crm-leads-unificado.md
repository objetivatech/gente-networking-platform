---
name: CRM Leads Unificado v3.24.0 / v3.25.0
description: Fundação e evolução do CRM unificado (crm_leads/crm_lead_history), edge functions submit-lead/send-contract/autentique-webhook/dispatch-hub-billing/get-contract-url/list-public-teams/migrate-existing-guests, kanban admin com HUB Ativo, contratos Autentique, promoção validada e trilha de auditoria completa
type: feature
---
v3.24.0 unifica leads via `crm_leads` no Supabase da Comunidade. LPs escrevem direto via edge function `submit-lead` (cross-project). Gente HUB = mesma role `convidado` + `source='lp_gentehub'` + coluna gerada `is_hub`. Kanban admin em `/admin/crm`.

v3.25.0 adiciona: status `hub_ativo`; flag `teams.is_hub` + trigger de roteamento automático; trigger de cobrança ao virar `qualificado` (HUB); contrato Autentique via `send-contract`/`autentique-webhook` com PDF salvo em bucket privado `contracts`; RPC `promote_crm_lead_to_member` com validações (conta, grupo, contrato assinado, pagamento pago; skip com motivo obrigatório); RPC `add_crm_lead_note`; drawer lateral no card do CRM (`LeadDrawer`, `LeadAuditTimeline`, `PromoteLeadDialog`); página `/admin/crm/auditoria` com filtros e CSV; `crm_lead_history` estendido com `source_snapshot`, `event_type`, `metadata`; secrets `AUTENTIQUE_API_KEY` + `AUTENTIQUE_WEBHOOK_SECRET`.

RLS: admin full, facilitador só do seu grupo, membro/convidado sem acesso. Storage `contracts`: admin lê via signed URL (`get-contract-url`, 5min), service role escreve.
