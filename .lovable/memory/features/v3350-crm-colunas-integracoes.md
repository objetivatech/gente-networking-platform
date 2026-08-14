---
name: v3.35.0 — CRM à prova de perdas, colunas configuráveis e Central de Integrações
description: Sincronização unilateral de leads (nunca sobrescreve), sanitização das páginas de captação, crm_pipeline_stages editáveis com notificação por coluna, integration_settings + email-provider multi-provedor
type: feature
---
**Regra permanente:** a sincronização de leads é UNILATERAL e ADITIVA. `migrate-existing-guests` e `submit-lead` nunca sobrescrevem `source`, `source_detail`, `status`, `notes` ou `metadata` de lead existente (metadata é merge). Trigger no banco bloqueia regressão de origem LP/site para `convite_manual`. Leads existentes no CRM não podem sumir.

**Páginas de captação:** `src/lib/crm-page-label.ts` (`formatLeadPageLabel`) normaliza títulos crus (`hub | location=pais`) em nome legível + badges de parâmetros; todas as origens seguem o padrão visual do "Quero Participar".

**Colunas do funil:** tabela `crm_pipeline_stages` (key, label, color, position, is_system, notify_on_enter, notify_emails, active). As 6 colunas originais são `is_system` — renomeáveis/reordenáveis, nunca excluíveis (enum `crm_lead_status`, triggers e RPCs dependem delas). UI: botão "Colunas" em `/admin/crm` → `StageManagerDialog`. Exclusão bloqueada se houver lead na coluna. Entrada em coluna com `notify_on_enter` dispara `notify-lead-stage`.

**Integrações (Configurações → Integrações, admin):** tabela `integration_settings` (payments/signature/email) com provedor ativo, ambiente, remetente e limite de disparos. Chaves de API SEMPRE no cofre de secrets, nunca no banco; `integration-status` só informa configurada/não configurada. Provedores: EFI/Mercado Pago/Asaas/Infinity Pay, Autentique/DocuSign/Clicksign, Resend/Brevo/Sender/SMTP.

**E-mail:** `supabase/functions/_shared/email-provider.ts` é o transporte único; templates permanecem na plataforma. `send-email` aplica rate limit (X envios / Y horas) e loga em `notification_dispatch_log`. E-mails transacionais (login, senha, confirmação, convites) nunca são bloqueados por limite.
