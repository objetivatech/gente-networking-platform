# CRM de Leads Unificado — v3.24.0 / v3.25.0

Arquitetura da unificação Leads (LPs) + CRM (Comunidade Gente).

## Decisões

- **Fonte única da verdade**: tabela `crm_leads` no Supabase da Comunidade (`vyfkddcbmwlwldaorxzy`). LPs escrevem direto aqui via edge function `submit-lead` (cross-project).
- **Gente HUB**: mesma role `convidado`, diferenciado por `source='lp_gentehub'` + coluna gerada `is_hub` + badge dourado no CRM. Sem sub-role no enum `app_role`.
- **Roteamento HUB**: `teams.is_hub=true` marca o grupo destino padrão dos leads HUB. Trigger BEFORE INSERT preenche `target_team_id` automaticamente.
- **Contratos** (v3.25.0): Autentique via edge function `send-contract`. Webhook `autentique-webhook` atualiza status e salva PDF assinado no bucket privado `contracts`.
- **Pagamentos**: colunas provisionadas (`payment_status`, `efi_subscription_id`). Provedor real na v3.26.

## Tabelas

### `crm_leads`
Campos: `name, email, phone, company, business_segment, source, source_detail, target_team_id, status, notes, invited_by, invitation_id, profile_id, meeting_attendance_count, first_attendance_at, is_hub (gerada), contract_status, contract_sent_at, contract_signed_at, contract_signed_pdf_path, autentique_document_id, payment_status, efi_subscription_id, metadata`.

Enum `crm_lead_source`: `lp_gentehub | lp_participe | lp_networking | site_elementor | convite_manual | api`.
Enum `crm_lead_status`: `novo | em_qualificacao | qualificado | hub_ativo | fechado | perdido`.

### `crm_lead_history` (v3.25.0)
Log completo: `from_status, to_status, moved_by, reason, source_snapshot, event_type, metadata (jsonb), created_at`.

Tipos de evento (`event_type`):

| Valor | Significado |
|---|---|
| `status_change` | Mudança de status do funil |
| `contract_sent` | Contrato criado no Autentique |
| `contract_signed` | Contrato assinado (webhook) |
| `contract_rejected` / `contract_expired` | Estados finais negativos do contrato |
| `hub_billing_triggered` | Cobrança HUB disparada ao virar Qualificado |
| `promoted` | Lead convertido em membro |
| `note_added` | Nota interna adicionada |

## RLS

| Role | crm_leads | crm_lead_history | Storage `contracts` |
|---|---|---|---|
| admin | full access | full access | leitura via signed URL (`get-contract-url`) |
| facilitador | SELECT/UPDATE apenas leads do seu grupo (`target_team_id`) | SELECT do próprio grupo | sem acesso |
| membro / convidado | sem acesso | sem acesso | sem acesso |
| anon | apenas via edge function `submit-lead` | — | — |

## Triggers automáticos

1. **`crm_leads_route_hub_trigger`** (v3.25) — BEFORE INSERT: leads HUB sem `target_team_id` são roteados para o primeiro `teams.is_hub=true`.
2. **`crm_leads_history_trigger`** — grava toda mudança de status em `crm_lead_history` capturando `auth.uid()`.
3. **`crm_leads_hub_billing_trigger`** (v3.25) — AFTER UPDATE: leads HUB indo para `qualificado` recebem `payment_status='pending'` e evento `hub_billing_triggered`.
4. **`crm_leads_attendance_sync`** — quando um convidado marca presença, move seu lead de `novo` → `em_qualificacao`.
5. **`crm_leads_role_sync`** — quando `user_roles` recebe role `membro`/`facilitador`, move o lead para `fechado`.

## Funções (RPCs)

### `promote_crm_lead_to_member(_lead_id, _team_id, _skip_contract=false, _skip_payment=false, _reason=null)`
Admin-only. Valida em ordem:
1. `profile_id IS NOT NULL` (lead precisa ter conta).
2. `_team_id` válido.
3. Se `source='lp_gentehub'` e não `_skip_contract` → exige `contract_status='signed'`.
4. Se `source='lp_gentehub'` e não `_skip_payment` → exige `payment_status='paid'`.
5. Skip requer `_reason` obrigatório.
Executa `promote_guest_to_member`, atualiza `status='fechado'` e loga em `crm_lead_history` com `event_type='promoted'`.

### `add_crm_lead_note(_lead_id, _note)`
Admin ou facilitador (facilitador só do seu grupo). Registra `event_type='note_added'`.

## Edge Functions

### `POST /submit-lead` (pública)
Cria lead + convite automático + email de boas-vindas. Ver seção anterior.

### `POST /send-contract` (admin)
Body: `{ lead_id }`. Cria documento no Autentique via API GraphQL, salva `autentique_document_id`, marca `contract_status='sent'`, loga evento.

### `POST /autentique-webhook?secret=<AUTENTIQUE_WEBHOOK_SECRET>` (público)
Recebe eventos do Autentique. Ao receber `document.signed`: baixa PDF, salva em `contracts/{lead_id}/{doc_id}.pdf`, marca `contract_status='signed'`, loga evento.

### `POST /dispatch-hub-billing` (admin/facilitador)
Reenvio manual do email de cobrança HUB. Registra evento.

### `POST /get-contract-url` (admin)
Body: `{ lead_id }`. Retorna signed URL do PDF assinado (expira em 5min).

### `GET /list-public-teams` / `POST /migrate-existing-guests`
Mantidas da v3.24.

## Secrets necessários
- `AUTENTIQUE_API_KEY` — token da API Autentique (obrigatório para envio de contrato).
- `AUTENTIQUE_WEBHOOK_SECRET` — gerado automaticamente, usado no query param do webhook.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — nativos.

## UI

- `/admin/crm` — Kanban com 5 ou 6 colunas (HUB Ativo aparece quando há leads HUB). Filtros: busca, origem, grupo, Somente HUB. Click no card abre drawer com dados, timeline, ações (contrato, promover, nota, baixar PDF, email).
- `/admin/crm/auditoria` — Trilha global filtrável (evento, origem, texto livre) + exportação CSV.

## Roadmap

- **v3.26** — Provedor de pagamento real (Efi ou Stripe) plugando em `payment_status`.
- **v3.27** — Migração do `useCreateLead` nas LPs para `submit-lead`.
- **Futuro** — Contratos com templates variáveis por plano (HUB vs Premium).
