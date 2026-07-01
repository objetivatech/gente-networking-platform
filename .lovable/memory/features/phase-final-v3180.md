---
name: Phase Final v3.18.0 — Exports estendidos + Sugestão semanal MatchMaking
description: Exportação Excel/PDF em Indicações e Negócios via ExportButton; weeklySuggestion determinística no MatchMaking
type: feature
---

# v3.18.0 — Conclusão do plano original

Fecha os itens remanescentes do plano de 11 solicitações.

## Item 9 — Exportação estendida (PDF/Excel)
- Novo componente reutilizável `src/components/ExportButton.tsx` que encapsula o dropdown Excel/PDF usando `src/lib/export-utils.ts` (`exportRowsToExcel`, `exportRowsToPDF`, `ExportColumn`).
- Integrado em `src/pages/Indicacoes.tsx` (indicações enviadas + recebidas com Tipo, Membro, Empresa, Contato, Telefone, Email, Status, Observações, Data).
- Integrado em `src/pages/Negocios.tsx` (negócios fechados + indicados com Tipo, Cliente, Contraparte, Descrição, Valor, Data).
- Identidade Navy `#1E3A5F` / Orange `#F7941D` já aplicada no header do PDF via export-utils.

## Item 1 — Sugestão da Semana no MatchMaking
- `src/hooks/useMatchmaking.ts` expõe `weeklySuggestion`: escolha determinística entre as 5 melhores sugestões ainda não conectadas, usando seed de semana ISO (`getIsoWeekSeed`). Estável nos 7 dias e rotaciona a cada semana, sem backend.
- `src/pages/Matchmaking.tsx` mostra um banner "Sugestão da semana" com ação "Conectar agora" que abre o mesmo diálogo de check (Gente em Ação + 10 pts).

## Não alterado
- Nenhuma regra de gamificação foi tocada; +10 pts do MatchMaking seguem via RPC `create_matchmaking_check`.
- Notificação semanal por e-mail (edge function agendada) fica como possível evolução futura, não implementada nesta versão.
