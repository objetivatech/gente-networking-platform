---
name: CRM Leads Unificado v3.24.0
description: Fundação do CRM unificado (crm_leads/crm_lead_history), edge functions submit-lead/list-public-teams/migrate-existing-guests, kanban admin, decisão Gente HUB via source tag, pagamentos/contratos adiados
type: feature
---
v3.24.0 unifica leads via tabela `crm_leads` no Supabase da Comunidade. LPs escrevem direto via edge function `submit-lead` (cross-project, sem sync). Gente HUB = mesma role `convidado` + `source='lp_gentehub'`, sem sub-role no enum. Kanban admin em `/admin/crm` com 5 colunas e select (sem drag-and-drop). Triggers sincronizam: presença→em_qualificacao, promoção→fechado. RLS: admin full, facilitador só do seu grupo, membro/convidado sem acesso. Colunas de contrato (Autentique) e pagamento já provisionadas. Migração do `useCreateLead` no projeto LPs (@LPs Gente) é sessão separada.
