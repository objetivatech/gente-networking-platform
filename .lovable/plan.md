# Plano de Unificação — Leads, CRM e Contratos (v3.24.0)

Baseado no PDF revisado e nas decisões:

- LPs escrevem direto no Gente (cross-project, sem sync);
- Lead do Gente HUB = mesma role `convidado` + `source='gente_hub'` (só tag/badge);
- **Pagamentos adiados** — arquitetura preparada mas fora do escopo desta versão;
- Contratos via **Autentique** (Fase futura, mas com colunas já prontas).

## Escopo desta entrega

```text
Fase 1  Fundação CRM         (agora)
Fase 2  Aba Convidados       (agora)
Fase 3  Kanban CRM Admin     (agora)
Fase 4  Autentique           (próxima release)
Fase 5  Pagamentos           (a decidir depois)
```

## Fase 1 — Fundação: `crm_leads` + ingestão pública

### 1.1 Migration

Nova tabela `crm_leads` (única fonte da verdade para leads/convidados). Já cria colunas de contrato/pagamento mesmo sem uso imediato — evita migration futura destrutiva.

Campos principais: `name, email, phone, company, business_segment, source` (enum: `lp_gentehub | lp_participe | lp_networking | site_elementor | convite_manual | api`), `source_detail, target_team_id, status` (enum: `novo | em_qualificacao | qualificado | fechado | perdido`), `notes, invited_by, invitation_id, profile_id, meeting_attendance_count, first_attendance_at, contract_status, payment_status, autentique_document_id, efi_subscription_id, metadata jsonb`.

Tabela auxiliar `crm_lead_history` (log de movimentações no kanban: `lead_id, from_status, to_status, moved_by, moved_at, reason`).

**RLS**:

- Admin: acesso total.
- Facilitador: SELECT/UPDATE apenas em leads com `target_team_id` pertencente ao(s) seu(s) grupo(s).
- Membro/convidado: sem acesso.
- Anon: apenas INSERT via edge function (nunca direto).

**Grants** conforme padrão: `GRANT ALL ON crm_leads TO service_role; GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated` (sem `anon`).

### 1.2 Edge Function `submit-lead` (pública, CORS aberto)

- Zod-valida body: `{ name, email, phone?, company?, business_segment?, target_team_id?, source, source_detail? }`.
- Deduplica por email: se já existir em `crm_leads`, faz UPDATE (merge não-destrutivo) e retorna id.
- Cria `invitation` automaticamente (30 dias, `invited_by = null` para origem LP, ou id do admin geral).
- Dispara email de boas-vindas via `send-email` com o link do convite.
- Retorna `{ lead_id, invitation_code, invite_url }`.

### 1.3 Edge Function `list-public-teams` (GET público)

Retorna `[{ id, name }]` dos grupos ativos — usada pelas LPs para popular o dropdown de escolha de grupo.

### 1.4 Ajuste no projeto @LPs Gente (documentado, não implementado nesta migração)

`useCreateLead` passa a fazer POST em `https://vyfkddcbmwlwldaorxzy.supabase.co/functions/v1/submit-lead` em vez de gravar em `leads` local. A tabela `leads` das LPs vira legado (mantida para histórico). **Esse ajuste será feito no projeto LPs em uma sessão separada** — este plano só entrega o endpoint do lado Gente.

### 1.5 Backfill

Edge Function one-shot `migrate-existing-guests`:

- Cria `crm_leads` para cada `invitations` com status `accepted` (status = `em_qualificacao`).
- Para convidados já promovidos a membros → `status='fechado'`.
- Deduplica por email.

## CONFIRME ANTES, MAS ACHO QUE JÁ TEMOS A ABA PARA CONVIDADOS NA PÁGINA DE ENCONTROS - Fase 2 — Aba de Convidados em `/encontros -` 

- Refatorar `Encontros.tsx` com `<Tabs>`: aba **Encontros** (atual) + aba **Convidados**.
- Aba Convidados lista todos com role `convidado`, join com `attendances` para count/última presença, filtros por grupo/período/status, colunas com badge de origem (LP/HUB/convite manual).
- Reaproveita `useAdminGuests`; adiciona `useGuestsWithAttendance`.
- Facilitador vê só do seu grupo; admin vê todos.
- Trigger em `attendances` (AFTER INSERT): se attendee é convidado e existe `crm_leads` correspondente com `status='novo'`, move para `em_qualificacao` e registra em `crm_lead_history`.

## Fase 3 — CRM Kanban `/admin/crm`

- Nova rota admin-only.
- `@dnd-kit/core` + `@dnd-kit/sortable` para drag-and-drop entre 5 colunas.
- Componentes: `CrmKanban`, `CrmLeadCard` (nome, badge grupo, badge origem com destaque para HUB, data), `CrmLeadDetail` (modal com histórico + ações), `CrmFilters` (grupo, origem, período, status).
- Ao mover para `fechado` manualmente: se `profile_id` existir → chama `promote_guest_to_member` automaticamente e adiciona ao `target_team_id`.
- Ao promover manualmente via `GestaoPessoas`: trigger atualiza `crm_leads.status='fechado'` (bidirecional).
- Item "CRM" no `Sidebar.tsx` visível só para admin.

## Fase 4 — Autentique (fora desta release, plano registrado)

Colunas já criadas em `crm_leads`. Próxima entrega:

- Secret `AUTENTIQUE_API_KEY` via `add_secret`.
- Bucket `contracts` com templates PDF.
- Edge Functions `autentique-create-document`, `autentique-webhook`, `autentique-check-status`.
- Botão "Enviar Contrato" no `CrmLeadDetail`.

## Fase 5 — Pagamentos (adiada)

A decidir entre Efi (BR-nativo, PIX/boleto) e Stripe (built-in Lovable). Recomendo revisitar após CRM em produção com dados reais de conversão.

## Impactos e riscos

- `crm_leads` é aditiva; não altera `invitations`, `profiles`, `user_roles` — zero risco para features existentes.
- Trigger de attendance é `AFTER INSERT` idempotente (só age se lead está em `novo`) — não interfere no fluxo de presença atual (que já foi corrigido em v3.11+).
- LPs continuam funcionando com sua tabela `leads` até a migração do hook — sem downtime.
- Cross-project CORS: `submit-lead` precisa liberar origem `gentenetworking.com.br` e domínios das LPs.

## Documentação e changelog

- Novo `docs/CRM_LEADS.md` (arquitetura, fluxos, webhooks).
- Atualizar `docs/USER_FLOWS.md` (jornada lead → convidado → membro).
- Atualizar `docs/TECHNICAL_DOCUMENTATION.md` (tabelas + edge functions).
- Atualizar `README.md` (novos endpoints públicos).
- Entrada `v3.24.0` em `system_changelog` cobrindo Fases 1-3.
- Registrar em `mem://features/crm-leads-unificado` a decisão arquitetural (fonte única = Gente, HUB via source tag).

## Ordem de implementação

1. Migration `crm_leads` + `crm_lead_history` + RLS + grants + triggers de sync bidirecional.
2. Edge Functions `submit-lead`, `list-public-teams`, `migrate-existing-guests`.
3. Hook `useCrmLeads` + backfill.
4. Aba Convidados em `Encontros.tsx` + trigger de attendance.
5. Página `/admin/crm` com Kanban + item no Sidebar.
6. Documentação + changelog v3.24.0.
7. (Sessão separada) Ajustar `useCreateLead` no projeto @LPs Gente para apontar para `submit-lead`.