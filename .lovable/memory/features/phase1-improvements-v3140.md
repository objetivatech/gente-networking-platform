---
name: Phase 1 Improvements (v3.14.0)
description: Guests-in-meetings tab gating, centralized Excel/PDF export, and admin 30-day ROI card
type: feature
---
# Fase 1 de Melhorias — v3.14.0

Primeira fase do plano de correções/melhorias.

## Item 11 — Aba "Convidados em Encontros" (Eventos)
- Em `src/pages/Encontros.tsx`, a aba é renderizada apenas quando `canViewGuestsDirectory(userRole)` é verdadeiro → visível para **membro** e **facilitador**, oculta para **convidado**.
- Listagem agrupada por **Grupo** (`groupedByTeam`) e, dentro, por **data do evento** (desc).
- Exibe dados de contato dos convidados presentes.
- Exportação Excel/PDF via dropdown.

## Item 9 — Exportação centralizada
- Utilitário compartilhado `src/lib/export-utils.ts`: `exportRowsToExcel(rows, columns, {fileName, sheetName})` e `exportRowsToPDF(rows, columns, {fileName, title, subtitle?})`.
- Tipo `ExportColumn<T> = { header, value(row) }`.
- Integrado no `AdminDataView.tsx` (usado por Indicações, Negócios, Gente em Ação, Depoimentos, Convites) com colunas específicas por tabela, resolvendo nomes de perfis e respeitando os filtros ativos (grupo/busca/período).

## Item 8 — ROI da Comunidade (admin)
- `useAdminDashboard.ts` calcula, para os últimos 30 dias: `last30BusinessValue`, `last30DealsCount` e `convertedReferrals` (negócios com `referred_by_user_id` preenchido).
- `AdminDashboard.tsx` exibe um card destacado "ROI da Comunidade — últimos 30 dias".

## Pendente (próximas fases — OAuth/Item 10 excluído por decisão do usuário)
- Fase 2: Health Score por membro (Item 4) + Relatório mensal por email (Item 5).
- Fase 3: Mural de Oportunidades (Item 7), Pedidos de Indicação broadcast (Item 3), notificações de Matchmaking (Item 1).
- Fase 4: Cartão digital com QR Code (Item 6), Agenda de slots 1x1 (Item 2).
