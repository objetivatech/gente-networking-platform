---
name: v3.37.0 Planos, assinaturas e cobranças
description: Área /admin/planos com planos recorrentes/pontuais, descontos, assinaturas por lead e disparo de cobrança com gate no CRM
type: feature
---

- Tabelas: `billing_plans`, `billing_discounts`, `billing_subscriptions`,
  `billing_charges`. RLS admin-only; membro só lê as próprias assinaturas/cobranças.
- Valor final da assinatura é calculado por trigger (`billing_apply_discount`),
  sempre em centavos. Validação de desconto por trigger (nunca CHECK).
- Página `src/pages/PlanosAssinaturas.tsx` (`/admin/planos`), item no grupo
  Administração da Sidebar. Hooks em `src/hooks/useBilling.ts`.
- Edge function `dispatch-billing-charge`: admin-only, idempotente por
  `subscription_id + due_date`, e-mail com identidade Gente Networking, registra
  em `crm_lead_history` (`billing_charge_sent` / `billing_charge_failed`).
- Gate: botão de cobrança do CRM (`HubBillingPanel`) só habilita com assinatura
  vinculada ao lead; planos inativos não podem ser cobrados.
