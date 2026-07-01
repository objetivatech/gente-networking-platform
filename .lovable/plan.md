# Plano — Itens restantes do plano original (v3.18.0)

Fiz a varredura do código. As Fases 1 a 4 estão implantadas (v3.14.0 → v3.17.0). O item 10 (OAuth) foi removido a seu pedido. Restam **apenas 2 itens** ainda não concluídos do plano original:

| # | Item | Status real | Ação |
| --- | --- | --- | --- |
| 9 | Exportação PDF/CSV **estendida** | Parcial — utilitário `src/lib/export-utils.ts` pronto e usado em Membros/Admin, mas **Indicações e Negócios não exportam** | Adicionar botões de export |
| 1 | Matchmaking: **sugestão semanal + notificação** | Faltando — nenhuma referência a sugestão semanal encontrada | Implementar destaque semanal + notificação |

Nada de gamificação, permissões ou KPIs muda. Entrego tudo como uma versão única **v3.18.0**.

---

## Item 9 — Exportação em Indicações e Negócios

Reaproveita o utilitário existente (`exportRowsToExcel` / `exportRowsToPDF`), sem novas dependências.

- **`src/pages/Indicacoes.tsx`**: adicionar um menu/botão "Exportar" (Excel e PDF) sobre a lista de indicações, com colunas: pessoa (de/para), empresa, descrição, status (frio/morno/quente), data. Exporta o que já está carregado/filtrado na tela.
- **`src/pages/Negocios.tsx`**: mesmo padrão, colunas: cliente, indicado por, descrição, valor (R$), data do negócio.
- Botões só aparecem para papéis já autorizados a ver a página (sem alterar RLS nem regras de acesso).
- Reutiliza o componente/padrão de botão de export já usado em `Membros.tsx` para consistência visual (Navy/Orange).

## Item 1 — Sugestão semanal de MatchMaking + notificação

Objetivo: destacar semanalmente "Quem você deveria conhecer esta semana" para membros, reforçando o uso do MatchMaking. Sem pontuar (pontos continuam apenas no registro do "Já conectei").

- **`src/hooks/useMatchmaking.ts`**: derivar uma `weeklySuggestion` — o melhor match pendente (maior `score`), estável por semana (seed pela semana ISO atual) para não trocar a cada refresh.
- **`src/pages/Matchmaking.tsx`**: card de destaque no topo ("Sua conexão da semana") com o perfil sugerido e atalho para o fluxo "Já conectei". Só exibe se o perfil do membro estiver completo (reaproveita o aviso já existente).
- **Notificação (respeitando opt-out):**
  - Edge function agendada `weekly-matchmaking-suggestion` (padrão das funções existentes como `monthly-member-report`), disparada por `pg_cron` uma vez por semana (ex.: segunda de manhã).
  - Para cada membro com perfil completo, calcula a sugestão da semana e envia e-mail via Resend usando os templates unificados (`supabase/functions/_shared/email-templates.ts`), respeitando `email_reports_enabled`/`NotificationSettings`.
  - Denominador exclui admin/facilitador/convidado (regra existente).

## Documentação, memória e changelog (obrigatório)

- `docs/TECHNICAL_DOCUMENTATION.md`: seção v3.18.0.
- `system_changelog`: nova entrada v3.18.0 (via migração de insert).
- `.lovable/memory/features/phase5-improvements-v3180.md` + atualização do `mem://index.md`.
- `src/pages/Documentacao.tsx`: menção às novas exportações e ao destaque semanal.
- `ScoringRulesCard.tsx`: **não** muda (nenhum item novo pontua).

## Detalhes técnicos

- Sem novas libs: `jspdf`, `jspdf-autotable` e `xlsx` já instalados.
- Cron: registrar job semanal em migração Supabase (mesmo padrão do relatório mensal). Requer que `pg_cron`/`pg_net` já habilitados (usados na Fase 2) — confirmarei na migração.
- Reforço de acesso via `src/lib/access-control.ts`: nenhum recurso novo members-only sem função + teste em `access-control.test.ts` (o destaque semanal segue `canUseMatchmaking`).
- Validação: `bun run test` (regressão de acesso) + `tsgo` typecheck antes de fechar.

## Fora de escopo (confirmado)

- Item 10 (OAuth Google/LinkedIn) — removido a seu pedido.
- Todos os demais itens (2,3,4,5,6,7,8,11) já estão implantados; não serão refeitos.
