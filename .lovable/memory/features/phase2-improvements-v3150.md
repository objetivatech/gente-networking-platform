---
name: Phase 2 Improvements (v3.15.0)
description: Member Health Score (admin engagement index) and automated monthly email report
type: feature
---
# Fase 2 de Melhorias — v3.15.0

Segunda fase do plano de correções/melhorias.

## Item 4 — Health Score por Membro
- Função SQL `get_members_health_scores(_days integer DEFAULT 60)` — `SECURITY DEFINER`, **apenas admin** (checa `user_roles.role = 'admin'`, senão `RAISE forbidden`).
- Score 0-100 (cap em 100) sobre os últimos N dias, com pesos: reunião 15, indicação 15, presença 20, depoimento 10, resposta conselho 5, case 10.
- `health_level`: `saudavel` (>=70), `atencao` (>=30), `risco` (<30). Retorna também `last_activity_at` e contagens por sinal.
- Frontend: hook `src/hooks/useMemberHealthScores.ts` + componente `src/components/MemberHealthScoreCard.tsx`, exibido em `AdminDashboard.tsx` (enabled apenas quando `userRole === 'admin'`).
- **Importante:** é métrica de retenção e NÃO entra em `calculate_monthly_points_for_team` (não contamina ranking).

## Item 5 — Relatório Mensal por Email
- Edge function `monthly-member-report` (Resend). Envia: resumo individual por membro (reuniões, indicações, presenças, pontos/rank, variação de posição vs mês anterior) e resumo da comunidade para admins.
- Mês alvo = mês anterior por padrão; aceita `{ year_month }` no body para reprocessar.
- Segurança: header `x-cron-secret` == `CRON_SECRET` OU JWT de admin. `verify_jwt=false` (default Lovable).
- Opt-out: coluna `profiles.email_reports_enabled` (default true), ajustável em `Configuracoes.tsx`.
- Agendamento: `pg_cron` job `monthly-member-report`, cron `0 8 1 * *` (dia 1, 08:00 UTC), criado via insert (dados específicos do projeto: URL + anon key + cron secret).

## Pendente (próximas fases)
- Fase 3: Mural de Oportunidades (Item 7), Pedidos de Indicação broadcast (Item 3), notificações de Matchmaking (Item 1).
- Fase 4: Cartão digital com QR Code (Item 6), Agenda de slots 1x1 (Item 2).
- Item 10 (OAuth) excluído por decisão do usuário.
