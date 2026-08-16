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

---

# v3.35.0 — Preservação de leads, colunas configuráveis e Integrações

## 1. Sincronização unilateral (leads nunca somem)

O backfill (`migrate-existing-guests`) sobrescrevia leads existentes ao casar por e-mail,
trocando a origem real (`lp_participe`, `site_elementor`) por `convite_manual`.

Correções:

- `migrate-existing-guests` passou a ser **estritamente aditivo**: em lead existente só
  preenche campos vazios (`invitation_id`, `target_team_id`, `profile_id`). Nunca toca em
  `source`, `source_detail`, `status`, `notes` ou `metadata`.
- `submit-lead` faz **merge** de `metadata` e mantém valores anteriores quando o novo
  payload vem vazio; não rebaixa o status do funil.
- Trigger de proteção no banco impede regressão de origem de LP/site para `convite_manual`.
- Origens perdidas foram restauradas a partir de `invitations.metadata` /
  `crm_leads.metadata.landing_page`, com registro em `crm_lead_history`.

Regra permanente: a sincronização é **unilateral** — captura dados das LPs, do site e de
outras fontes mapeadas, e nunca apaga ou reclassifica o que já está no CRM.

## 2. Cards de origem sanitizados

`src/lib/crm-page-label.ts` normaliza os títulos crus das LPs
(`hub | location=pais | referral=outro`) em nome legível + badges de parâmetros, deixando
todas as origens com a mesma apresentação de "Quero Participar".

## 3. Colunas configuráveis do funil

Tabela `crm_pipeline_stages`: `key, label, description, color, position, is_system,
notify_on_enter, notify_emails, active`.

- As 6 colunas originais são `is_system = true`: podem ser renomeadas, recoloridas e
  reordenadas, **nunca excluídas** (triggers, RPCs e enum `crm_lead_status` dependem delas).
- Colunas novas são livres; a exclusão é bloqueada enquanto houver lead na coluna.
- UI: botão **Colunas** em `/admin/crm` (`StageManagerDialog`).

## 4. Notificações por troca de coluna

`notify_on_enter` + `notify_emails` por coluna. A entrada de um lead dispara
`notify-lead-stage`, que registra o envio em `notification_dispatch_log`. Colunas de
sistema mantêm as automações anteriores intactas.

## 5. Central de Integrações (Configurações → Integrações, admin)

Tabela `integration_settings` (categorias `payments`, `signature`, `email`):

| Categoria | Provedores | Secret esperada |
|---|---|---|
| Pagamentos | EFI, Mercado Pago, Asaas, Infinity Pay | `EFI_API_KEY`, `MERCADOPAGO_API_KEY`, `ASAAS_API_KEY`, `INFINITYPAY_API_KEY` |
| Assinatura | Autentique, DocuSign, Clicksign | `AUTENTIQUE_API_KEY`, `DOCUSIGN_API_KEY`, `CLICKSIGN_API_KEY` |
| E-mail | Resend, Brevo, Sender, SMTP | `RESEND_API_KEY`, `BREVO_API_KEY`, `SENDER_API_KEY`, `SMTP_API_KEY` |

**Nenhuma chave é gravada no banco.** As chaves ficam no cofre de secrets do Supabase; a UI
só mostra "configurada / não configurada" via `integration-status` e grava provedor ativo,
ambiente, remetente e limite de disparos.

## 6. Troca de provedor de e-mail sem tocar nos templates

`supabase/functions/_shared/email-provider.ts` concentra o transporte. Os templates seguem
na plataforma; `send-email` apenas escolhe o provedor ativo, aplica o limite
(X envios em Y horas) e registra em `notification_dispatch_log`.
E-mails transacionais (login, redefinição, convites) **nunca** são bloqueados por limite.

## v3.36.0 — Integrações e vínculo com encontros Gente HUB

### Chaves de API na própria plataforma
Em **Configurações → Integrações** (admin) é possível cadastrar, substituir e
remover as chaves de cada provedor (pagamentos, assinatura digital e e-mail).
Os valores são gravados cifrados no cofre do banco e nunca voltam para a tela —
o painel mostra apenas "configurada" ou "vazia". Chaves que já existiam como
variáveis de ambiente continuam válidas: o cofre tem prioridade, o ambiente é o
fallback. O botão **Testar conexão** valida a credencial ativa e grava o
resultado em `integration_settings.last_check_ok`.

### Lead ↔ encontro Gente HUB
- Tabela `meeting_lead_attendances` (única por `meeting_id + lead_id`) liga um
  lead do CRM a um encontro, sem exigir conta na plataforma.
- No painel do lead há o bloco **Encontros Gente HUB**, que lista apenas os
  encontros com `event_type = 'hub_event'` de hoje em diante.
- `submit-lead` vincula automaticamente ao próximo encontro HUB em aberto todo
  lead com origem `lp_gentehub` e devolve `hub_meeting_id` na resposta.
- A página de **Encontros** exibe esses leads em um bloco próprio ("Leads do
  CRM"), junto de membros e convidados.
- **Convites** e CRM leem os encontros pelo mesmo hook (`useHubMeetings`), então
  as duas telas nunca divergem.
