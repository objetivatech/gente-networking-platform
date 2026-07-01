---
name: Phase 3 Improvements (v3.16.0)
description: Mural de Oportunidades e Pedidos de Indicação (broadcast) — features members-only da Fase 3
type: feature
---
# Fase 3 de Melhorias — v3.16.0

Terceira fase do plano (`.lovable/plan.md`). Duas novas features members-only, sem impacto na gamificação.

## Item 7 — Mural de Oportunidades
- Tabela `public.opportunities` (`type`: servico|parceria|demanda|outro, `title`, `description`, `status`: aberta|fechada).
- RLS members-only via `public.is_community_member(uuid)` (admin/facilitador/membro). Convidado NÃO acessa. Autor edita/remove o próprio; admin modera.
- Frontend: hook `src/hooks/useOpportunities.ts`, página `src/pages/Oportunidades.tsx` (`/oportunidades`).

## Item 3 — Pedidos de Indicação (broadcast)
- Tabelas `public.referral_requests` (`title`, `description`, `target_segment`, `status`: aberta|atendida|fechada) e `public.referral_request_responses` (`message`, `referral_id` opcional → `referrals`).
- RLS members-only (mesma função). Autor/admin moderam; qualquer membro responde. Atalho "Registrar indicação" leva a `/indicacoes`.
- Frontend: hook `src/hooks/useReferralRequests.ts`, página `src/pages/PedidosIndicacao.tsx` (`/pedidos-indicacao`).

## Acesso e testes
- Funções em `src/lib/access-control.ts`: `canUseOpportunityBoard`, `canUseReferralRequests` (admin/facilitador/membro). Testes em `access-control.test.ts`.
- Itens de menu adicionados no `Sidebar.tsx` (Megaphone / Radio).

## Decisões de escopo
- NÃO pontuam (não entram em `calculate_monthly_points_for_team`) para não desbalancear o ranking.
- Helper SQL `is_community_member` é `SECURITY DEFINER` sobre `user_roles`.

## Pendente (Fase 4)
- Item 1 (melhoria): sugestão semanal de matchmaking + notificação.
- Item 6: Cartão digital + QR. Item 2: Agenda 1x1 (.ics). Item 10 (OAuth) excluído.
