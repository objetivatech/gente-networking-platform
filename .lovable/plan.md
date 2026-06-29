# Plano de Correções e Melhorias — Gente Networking

Atuando como responsável técnico, fiz uma varredura do código antes de planejar. Vários itens **já existem** total ou parcialmente. O plano abaixo separa o que é **novo**, **ajuste** e **já pronto**, com recomendações de melhoria em cada um.

## Diagnóstico rápido por item


| #   | Item                                   | Status atual                                                  | Ação                                     |
| --- | -------------------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| 1   | Matchmaking inteligente                | **Já implementado** (v3.11.0, cruza ideal_client × what_i_do) | Melhorar: sugestão semanal + notificação |
| 2   | Agenda 1x1 / Google Calendar           | **Novo**                                                      | Implementar slots + link de calendário   |
| 3   | Pedidos de Indicação (broadcast)       | **Novo** (Conselho existe, mas é Q&A)                         | Nova feature                             |
| 4   | Health Score por membro                | **Novo** (dados já existem)                                   | Calcular e exibir p/ admin               |
| 5   | Relatório mensal por email             | **Novo** (infra Resend pronta)                                | Edge function + cron                     |
| 6   | Cartão digital + QR code               | **Novo** (perfil público `/membro/:slug` existe)              | Gerar cartão/QR                          |
| 7   | Mural de Oportunidades                 | **Novo**                                                      | Nova feature                             |
| 8   | Métricas de ROI p/ admin               | **Parcial** (dashboard já soma negócios)                      | Adicionar painel ROI dedicado            |
| 9   | Exportação PDF/CSV                     | **Parcial** (Membros já exporta PDF/Excel)                    | Estender p/ indicações e negócios        |
| 10  | OAuth Google + LinkedIn                | **Novo** (hoje só email/senha)                                | Habilitar provedores                     |
| 11  | Aba de convidados presentes em Eventos | **Já implementado** (aba "Convidados em Encontros")           | Ajuste: gating de role + organização     |


## PODE REMOVER O ITEM 10 - NÃO PRECISAMOS MAIS DISSO.

&nbsp;

## Recomendação de faseamento

Sugiro **não** entregar tudo de uma vez (risco de regressão na gamificação, permissões e KPIs interligados). Proponho 4 fases. Você aprova e eu executo fase a fase.

### Fase 1 — Ajustes do que já existe (baixo risco, alto valor)

- **Item 11 (ajuste):** a aba "Convidados em Encontros" em `/encontros` já lista convidados com contato, agrupados por encontro. Ajustes:
  - Garantir que **convidados (role `convidado`) NÃO vejam a aba** nem a página com dados de contato (gating por `canViewGuestsDirectory`).
  - Reordenar/agrupar explicitamente por **grupo → data do evento** (hoje é por encontro/data).
  - Confirmar que Admin continua com acesso (não bloquear, apenas não é foco dele).
- **Item 9 (extensão):** reaproveitar o utilitário de export do `Membros.tsx` (jspdf + xlsx já instalados) para criar exportação em **Indicações** (`/indicacoes`) e **Negócios** (`/negocios`), e um export consolidado no dashboard admin.
- **Item 8 (extensão):** novo card "ROI da Comunidade" no `/dashboard` usando dados já agregados em `useAdminDashboard` (negócios fechados R$, nº de indicações convertidas, janela 30 dias).

### Fase 2 — Health Score + Relatório por email (retenção)

- **Item 4 — Health Score:** função SQL `calculate_member_health_score(_user_id, _period)` combinando sinais já existentes: reuniões (gente_em_acao), indicações dadas/recebidas (referrals), presença (attendances), posts/respostas (council). Exibir só para admin em `/dashboard` (coluna/sparkline por membro). Não interfere no ranking de pontos.
- **Item 5 — Relatório mensal:** edge function `monthly-member-report` (Resend já configurado) + `pg_cron` mensal. Email com nº de reuniões, indicações, variação de posição no ranking. Versão admin: resumo da comunidade. Respeitar `NotificationSettings` (opt-out).

### Fase 3 — Novas features de negócio

- **Item 7 — Mural de Oportunidades:** tabela `opportunities` (autor, tipo serviço/parceria, descrição, status), RLS members-only, página `/oportunidades`, integra activity_feed. Separado do feed social.
- **Item 3 — Pedidos de Indicação (broadcast):** tabela `referral_requests` ( "preciso de indicação para X") + respostas, members-only, conecta com `referrals` existente quando alguém atende. Notificação aos membros do grupo.
- **Item 1 (melhoria):** sugestão semanal de matchmaking + notificação ("Quem você deveria conhecer esta semana").

### Fase 4 — Integrações externas

- **Item 6 — Cartão digital + QR:** componente que gera cartão a partir do perfil + QR (lib `qrcode`) apontando para `/membro/:slug`. Botão "Baixar cartão" (PNG/PDF).
- **Item 2 — Agenda 1x1:** slots de disponibilidade no perfil + botão "Agendar 1x1" no perfil do membro, gerando link `.ics`/Google Calendar. Integração OAuth com Google Calendar é opção avançada (requer config externa) — recomendo começar com `.ics` (sem dependência externa).
- **Item 10 — OAuth Google + LinkedIn:** habilitar provedores no Supabase Auth + botões no `/auth`. **Atenção:** requer configuração de credenciais no dashboard Supabase (passo manual seu). LinkedIn import de dados profissionais depende de scopes — escopo a validar. - **NÃO É MAIS NECESSÁRIO ESSE ITEM!**

## Interrelações de dados (cuidados)

- **Gamificação:** Health Score (item 4) é métrica separada, **não** soma pontos — evita contaminar ranking. Mural/Pedidos (3,7) podem ou não pontuar; recomendo **não pontuar** inicialmente para não desbalancear `calculate_monthly_points_for_team`.
- **Permissões:** tudo members-only passa por `src/lib/access-control.ts` + RLS + teste de regressão em `access-control.test.ts`.
- **KPIs/Relatórios:** denominadores continuam excluindo admin/facilitador/convidado (regra existente).
- **Notificações:** novos emails respeitam preferências em `NotificationSettings`.

## Documentação e Changelog (em toda fase)

- `docs/TECHNICAL_DOCUMENTATION.md` + memórias `.lovable/memory/features/*` por feature.
- `src/pages/Documentacao.tsx` (guia de uso) e `ScoringRulesCard.tsx` se houver pontuação.
- Entrada no `system_changelog` por fase (v3.14.0 → v3.17.0).

## Perguntas antes de executar

Preciso de 2 definições para fechar o escopo (farei na sequência via perguntas).