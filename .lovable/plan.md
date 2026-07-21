# Plano v3.25.0 — CRM: HUB, Contratos, Promoção e Auditoria

Evolução do CRM unificado (v3.24.0) com automações HUB, contratos digitais Autentique, fluxo de promoção validado e trilha de auditoria completa. Nada quebra o CRM atual: tudo é aditivo, com feature flags implícitas por `source` e por presença de configuração (ex.: só dispara Autentique se `AUTENTIQUE_API_KEY` estiver setado).

## 1. Gente HUB — diferenciação e automações

### Schema (migration)
- `teams`: adicionar `is_hub boolean default false`.
- `crm_leads`: adicionar `is_hub boolean generated always as (source='lp_gentehub') stored` (badge/filtro derivado, sem denormalização manual).
- `crm_leads`: novo enum item em `crm_lead_status` → `hub_ativo` (entre `qualificado` e `fechado`, exclusivo para leads HUB).

### Trigger de encaminhamento (BEFORE INSERT)
- Se `source='lp_gentehub'` e `target_team_id IS NULL` → preencher com o primeiro `teams.is_hub=true` disponível.
- Se nenhum grupo HUB existir, deixar NULL e registrar aviso em `metadata.warnings`.

### Trigger de cobrança (AFTER UPDATE OF status)
- Quando `status` muda para `qualificado` E `source='lp_gentehub'`:
  - Setar `payment_status='pending'`.
  - Chamar edge function `dispatch-hub-billing` via `pg_net` (best-effort) que envia email com link de checkout placeholder (provedor real fica para v3.26, mas o gancho já existe).
  - Registrar evento em `crm_lead_history` com `reason='hub_billing_triggered'`.

### Kanban (AdminCrm.tsx)
- Nova coluna **HUB Ativo** (6 colunas totais), visível só quando existem leads HUB ou filtro "Somente HUB" está ativo.
- Badge dourado "HUB" nos cards com `is_hub=true`.
- Filtro rápido "Somente HUB" (toggle) além dos filtros atuais.

## 2. Contrato Autentique

### Schema
- `crm_leads.autentique_document_id` e `contract_status` já existem (v3.24). Adicionar:
  - `contract_signed_pdf_path text` (path no Storage).
  - `contract_sent_at`, `contract_signed_at timestamptz`.
- Novo bucket privado `contracts` no Supabase Storage (RLS: só admin lê; service_role escreve).
- Secret: `AUTENTIQUE_API_KEY` via `add_secret` (o gancho fica ativo só quando o secret existir).

### Edge functions
- **`send-contract`** (admin-only, verify JWT em código):
  - Body: `{ lead_id, template_id? }`.
  - Chama Autentique GraphQL API criando documento com signatários (email do lead + admin).
  - Salva `autentique_document_id`, `contract_status='sent'`, `contract_sent_at=now()`.
  - Registra em `crm_lead_history` (`reason='contract_sent'`).
- **`autentique-webhook`** (público, verifica assinatura HMAC do Autentique):
  - Evento `document.signed` → baixa PDF, salva em `contracts/{lead_id}/{doc_id}.pdf`, atualiza `contract_status='signed'`, `contract_signed_at`, `contract_signed_pdf_path`.
  - Registra em `crm_lead_history` (`reason='contract_signed'`).

### Automação por origem
- Trigger AFTER UPDATE em `crm_leads`: quando `status` vira `qualificado` E `source='lp_gentehub'` E `AUTENTIQUE_API_KEY` configurado → invocar `send-contract` automaticamente via `pg_net`.
- Para outros sources: botão manual "Enviar contrato" no drawer do lead.

### UI (AdminCrm)
- Card do lead: ícone de contrato colorido por estado (não enviado / enviado / assinado / rejeitado).
- Drawer (ver seção 4): botão **Enviar contrato** (desabilitado se já enviado); link para PDF assinado quando disponível.

## 3. Promoção de lead → membro no AdminCrm

### RPC nova: `promote_crm_lead_to_member(_lead_id uuid, _team_id uuid, _skip_contract boolean default false, _skip_payment boolean default false)`
Executa como `SECURITY DEFINER`, apenas admin. Validações em ordem:
1. Lead existe e `profile_id IS NOT NULL` → senão retorna erro "Lead ainda não criou conta".
2. `_team_id` fornecido e válido → senão erro "Selecione o grupo destino".
3. Se `source='lp_gentehub'` e não `_skip_contract` → exigir `contract_status='signed'`.
4. Se `source='lp_gentehub'` e não `_skip_payment` → exigir `payment_status='paid'`.
5. Chama `promote_guest_to_member(profile_id, 'membro', _team_id)` (RPC já existente).
6. Atualiza `crm_leads.status='fechado'`.
7. `_skip_contract`/`_skip_payment` disponíveis só para admin, exigem `reason` obrigatório gravado em `crm_lead_history`.

### UI: novo componente `PromoteLeadDialog`
- Botão "Promover para membro" no drawer do lead (habilitado só quando validações preliminares passam; mostra checklist do que falta).
- Select de grupo destino (default = `target_team_id` do lead; admin pode trocar).
- Checkbox "Ignorar contrato" / "Ignorar pagamento" (só aparece se pendente; exige `reason`).
- Confirmação: mostra resumo antes de executar.

### Hook: `usePromoteCrmLead` em `src/hooks/useCrmLeads.ts` invalidando `['crm-leads']`, `['admin-members']`, `['members-directory']`.

## 4. Trilha de auditoria

### Schema
- `crm_lead_history` já tem `from_status`, `to_status`, `moved_by`, `reason`, `created_at`. Adicionar:
  - `source_snapshot crm_lead_source` (snapshot da origem no momento do evento).
  - `event_type text` (`status_change | contract_sent | contract_signed | promoted | hub_billing_triggered | note_added | manual_edit`).
  - `metadata jsonb default '{}'` (payload livre: skip_reason, doc_id, etc).
- Índice `(lead_id, created_at desc)`.

### Trigger existente atualizado
- Setar `moved_by = auth.uid()` (hoje pode estar NULL em algumas paths). Ajustar `crm_leads_history_trigger` para capturar `auth.uid()`; quando disparado por outro trigger sistema (SECURITY DEFINER), gravar `moved_by=NULL` + `metadata.system=true`.

### UI-A: Drawer de auditoria no card (AdminCrm)
- Clicar no card → abre `Sheet` lateral com:
  - Dados completos do lead.
  - Timeline vertical de `crm_lead_history` (mais recente primeiro): quem, quando, from→to, motivo, evento.
  - Ações: **Enviar contrato**, **Promover**, **Adicionar nota** (registra `event_type='note_added'`).

### UI-B: Página `/admin/crm/auditoria`
- Tabela paginada de `crm_lead_history` com filtros: lead (autocomplete), usuário (moved_by), período, `event_type`, `source_snapshot`.
- Botão **Exportar CSV** (reutiliza `ExportButton`).
- Link no header do AdminCrm: "Ver auditoria".

## 5. Documentação e changelog

- Atualizar `docs/CRM_LEADS.md`: nova coluna HUB, fluxo Autentique, RPC de promoção, tabela de eventos de auditoria, secret `AUTENTIQUE_API_KEY`, bucket `contracts`.
- Atualizar `docs/TECHNICAL_DOCUMENTATION.md` e `docs/USER_FLOWS.md` (seção Admin → CRM).
- Novo entry em `system_changelog`: v3.25.0 com bullets de HUB / Contratos / Promoção / Auditoria.
- Memory update: `mem://features/crm-leads-unificado` → refletir v3.25.
- Novo memory: `mem://features/crm-contract-flow` documentando o gancho Autentique e o bucket privado.

## 6. Segurança e não-regressão

- RLS: novas colunas herdam policies existentes de `crm_leads`. `contract_signed_pdf_path` **não** vai para membros/facilitadores (facilitador continua vendo só leads do seu grupo, sem PDF).
- Bucket `contracts`: policy só service_role escreve, só admin lê via signed URL de curta duração gerada pela função `get-contract-url` (admin-only).
- `autentique-webhook` valida HMAC — sem secret, retorna 503 (nunca aceita evento não-assinado).
- Não altera `useCreateLead` das LPs nem funções v3.24 já em produção; só adiciona.
- Testes de regressão: rodar `bun run test` em `access-control.test.ts` e adicionar teste para `promote_crm_lead_to_member` (mock RPC).
- Rodar `supabase--linter` após migration.

## Detalhes técnicos

```text
Fluxo HUB completo:
LP Gente HUB → submit-lead (source=lp_gentehub)
   ↓ trigger BEFORE INSERT: target_team_id ← teams.is_hub
   ↓ status=novo
[usuário cria conta] → profile_id preenchido
[marca presença] → trigger existente → status=em_qualificacao
[admin move] → status=qualificado
   ↓ trigger cobrança: payment_status=pending + email checkout
   ↓ trigger contrato (se AUTENTIQUE_API_KEY): send-contract → contract_status=sent
[usuário assina no Autentique] → webhook → contract_status=signed + PDF no Storage
[admin move] → status=hub_ativo (validado: contract=signed, payment=paid)
[admin clica Promover] → PromoteLeadDialog → promote_crm_lead_to_member
   ↓ valida tudo → promote_guest_to_member → status=fechado
Todos os passos gravam em crm_lead_history com moved_by, event_type, metadata.
```

Arquivos novos:
- `supabase/functions/send-contract/index.ts`
- `supabase/functions/autentique-webhook/index.ts`
- `supabase/functions/dispatch-hub-billing/index.ts`
- `supabase/functions/get-contract-url/index.ts`
- `src/components/crm/LeadDrawer.tsx`
- `src/components/crm/PromoteLeadDialog.tsx`
- `src/components/crm/LeadAuditTimeline.tsx`
- `src/pages/AdminCrmAuditoria.tsx`

Arquivos alterados:
- `src/pages/AdminCrm.tsx` (coluna HUB, filtro HUB, click abre drawer)
- `src/hooks/useCrmLeads.ts` (novos hooks: `usePromoteCrmLead`, `useSendContract`, `useLeadHistory`, `useCrmAudit`)
- `src/App.tsx` (rota `/admin/crm/auditoria`)
- `docs/CRM_LEADS.md`, `docs/TECHNICAL_DOCUMENTATION.md`, `docs/USER_FLOWS.md`
- `src/integrations/supabase/types.ts` (regenerado pós-migration)
