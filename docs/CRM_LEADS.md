# CRM de Leads Unificado — v3.24.0

Arquitetura da unificação Leads (LPs) + CRM (Comunidade Gente).

## Decisões

- **Fonte única da verdade**: tabela `crm_leads` no Supabase da Comunidade (`vyfkddcbmwlwldaorxzy`). LPs escrevem direto aqui via edge function `submit-lead` (cross-project).
- **Gente HUB**: mesma role `convidado`, diferenciado apenas por `source='lp_gentehub'` + badge no CRM. Sem sub-role no enum `app_role`.
- **Pagamentos**: adiados. Colunas `payment_status` e `efi_subscription_id` provisionadas para não exigir migration destrutiva futura.
- **Contratos**: integração Autentique planejada para v3.25. Colunas `contract_status` e `autentique_document_id` já criadas.

## Tabelas

### `crm_leads`
Campos principais: `name, email, phone, company, business_segment, source, source_detail, target_team_id, status, notes, invited_by, invitation_id, profile_id, meeting_attendance_count, first_attendance_at, contract_status, payment_status, autentique_document_id, efi_subscription_id, metadata`.

Enum `crm_lead_source`: `lp_gentehub | lp_participe | lp_networking | site_elementor | convite_manual | api`.
Enum `crm_lead_status`: `novo | em_qualificacao | qualificado | fechado | perdido`.

### `crm_lead_history`
Log de movimentações no kanban (from_status, to_status, moved_by, reason, created_at). Alimentado automaticamente por trigger.

## RLS

| Role | crm_leads | crm_lead_history |
|---|---|---|
| admin | full access | full access |
| facilitador | SELECT/UPDATE apenas leads do seu grupo (`target_team_id`) | SELECT do próprio grupo |
| membro / convidado | sem acesso | sem acesso |
| anon | apenas via edge function `submit-lead` (service role) | — |

## Triggers automáticos

1. **`crm_leads_history_trigger`** — grava toda mudança de status em `crm_lead_history`.
2. **`crm_leads_attendance_sync`** — quando um convidado tem presença marcada, move seu lead de `novo` → `em_qualificacao` e incrementa `meeting_attendance_count`.
3. **`crm_leads_role_sync`** — quando `user_roles` recebe role `membro` ou `facilitador`, move o lead correspondente para `fechado`.

## Edge Functions

### `POST /submit-lead` (pública, sem auth)

Body:
```json
{
  "name": "string (2-120)",
  "email": "string (valid email)",
  "phone": "string?",
  "company": "string?",
  "business_segment": "string?",
  "target_team_id": "uuid?",
  "source": "lp_gentehub | lp_participe | lp_networking | site_elementor | convite_manual | api",
  "source_detail": "string? (ex: slug da LP)",
  "app_base_url": "string? (default: https://comunidade.gentenetworking.com.br)"
}
```

Resposta:
```json
{ "lead_id": "uuid", "invitation_id": "uuid", "invitation_code": "STRING", "invite_url": "..." }
```

- Dedup por email (case-insensitive).
- Cria automaticamente `invitation` com `invited_by` = primeiro admin ativo (fallback quando LP não sabe quem convidou).
- Dispara email de boas-vindas via `send-email` (best-effort, não bloqueante).

### `GET /list-public-teams` (pública)

Retorna `{ teams: [{ id, name }] }` para popular dropdown de escolha de grupo nas LPs.

### `POST /migrate-existing-guests` (admin only)

Backfill idempotente: cria `crm_leads` para cada `invitations` existente. Marca como:
- `fechado` se o accepted_by já é membro/facilitador
- `em_qualificacao` se aceito mas ainda convidado
- `novo` se pendente

## Integração com LPs Gente Networking (@LPs Gente)

**Ainda não migrado** — sessão separada. Ajuste esperado:

```ts
// Antes (src/hooks/useLeads.ts no projeto LPs)
await supabase.from('leads').insert({ ...lead, status: 'new' });

// Depois
await fetch('https://vyfkddcbmwlwldaorxzy.supabase.co/functions/v1/submit-lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...lead,
    source: 'lp_gentehub', // ou lp_participe, lp_networking conforme LP
    source_detail: window.location.pathname,
  }),
});
```

A tabela `leads` do projeto LPs vira legado (mantida para histórico).

## Roadmap

- **v3.25** — Integração Autentique (contratos digitais)
- **v3.26** — Provedor de pagamento (Efi ou Stripe, a decidir)
- **v3.27** — Migração do `useCreateLead` nas LPs para `submit-lead`
