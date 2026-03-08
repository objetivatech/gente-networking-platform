

# Plano Completo de Evolução da Plataforma Gente Networking

## Visão Geral

Este plano cobre 16 solicitações agrupadas em **6 fases de implementação**, priorizadas por dependência técnica e impacto. A estimativa total é de **15-20 ciclos de implementação** (mensagens).

---

## Fase 1: Papéis e Permissões (Itens 1a, 1b, 13)

### 1a - Redesenho do acesso do Administrador

**Situação atual:** Admin vê as mesmas páginas que membros (formulários de lançamento em Gente em Ação, Depoimentos, etc.)

**Proposta:**
- Cada página de atividade (GenteEmAcao, Depoimentos, Indicações, Negocios, Convites, Encontros) passará a exibir **duas visões** condicionais baseadas no role:
  - **Membro/Facilitador:** formulário de lançamento + listagem pessoal (como hoje)
  - **Admin:** painel de gestão com listagem completa de todos os registros + filtros por grupo, período e membro
- O botão "Novo Registro" será ocultado para admin nessas páginas
- A página de Estatísticas para admin substituirá "Minhas Estatísticas" por "Relatório Geral" com dados de todos os membros
- Admin será excluído da gamificação (não pontua, não aparece no ranking)

### 1b - Facilitador não pontua

- Facilitador continua podendo lançar atividades, mas seus registros não contarão para a gamificação
- Ajuste na função `calculate_monthly_points_for_team` para ignorar usuários com role `facilitador`
- Facilitador não aparecerá nos rankings

### Item 13 - Controle total do Admin sobre registros

- Nas visões administrativas das páginas de atividades, o admin terá botões de **editar** e **excluir** registros de qualquer membro
- Criação de novas RLS policies permitindo admin fazer UPDATE/DELETE em todas as tabelas de atividades
- Novo item no menu admin: **"Gestão de Registros"** (`/admin/registros`) com interface unificada para buscar e gerenciar qualquer registro do sistema (Gente em Ação, Depoimentos, Indicações, Negócios, Convites)

**Alterações de banco de dados:**
- Novas RLS policies para admin em `gente_em_acao`, `testimonials`, `referrals`, `business_deals`, `invitations`
- Ajuste nas funções de cálculo para excluir admin e facilitador

**Arquivos afetados:** `GenteEmAcao.tsx`, `Depoimentos.tsx`, `Indicacoes.tsx`, `Negocios.tsx`, `Convites.tsx`, `Encontros.tsx`, `Estatisticas.tsx`, `Sidebar.tsx`, nova página `AdminRegistros.tsx`, hooks correspondentes

---

## Fase 2: Mobile e UX (Item 2)

### Responsividade e experiência mobile

**Diagnóstico:** O layout atual usa sidebar fixa de 264px + conteúdo. No mobile, a sidebar é um drawer. O conteúdo principal não tem otimização específica para telas pequenas.

**Proposta:**
1. **Bottom Navigation Bar** para mobile (visível apenas em telas < 1024px):
   - Barra fixa na parte inferior com 4-5 ícones dos recursos mais usados
   - Customizada por role:
     - **Membro:** Gente em Ação, Negócios, Indicações, Convites, Perfil
     - **Admin:** Dashboard, Gestão de Pessoas, Admin, Ranking
     - **Facilitador:** Admin, Gestão de Pessoas, Encontros, Estatísticas

2. **Dashboard Mobile redesenhada:**
   - Cards de ação rápida em grid 2x2 com ícones grandes
   - Resumo de pontos compacto
   - Feed de atividades simplificado

3. **Ajustes globais de responsividade:**
   - Revisar todos os grids e tabelas para mobile
   - Ajustar tamanhos de fonte e espaçamentos
   - Garantir que diálogos/modals funcionem bem em mobile
   - Adicionar `safe-area-inset` para iPhones com notch

**Arquivos afetados:** Novo componente `BottomNav.tsx`, `MainLayout.tsx`, `Index.tsx`, `src/index.css`, várias páginas

---

## Fase 3: Feed de Atividades e Notificações (Itens 4, 8, 12)

### Item 8 - Feed de Atividades completo

**Proposta:**
1. **Nova página `/feed`** com feed completo e detalhado:
   - Filtros por grupo, tipo de atividade e período
   - Cada item é clicável e expande detalhes do lançamento
   - Membros só veem atividades de colegas do mesmo grupo (RLS via nova coluna `team_id` na `activity_feed`)
   - Paginação infinita (scroll)

2. **Header (sininho):** links para `/feed` ao clicar em uma notificação
3. **Index (Atividades Recentes):** mantém resumo com link "Ver todas" apontando para `/feed`
4. **Item 12 (Dashboard admin):** conectar o bloco "Atividades Recentes" ao mesmo hook `useActivityFeed`, que já funciona mas não está populando porque o `activity_feed` pode estar vazio

**Alterações de banco de dados:**
- Adicionar `team_id` na tabela `activity_feed` para filtragem por grupo
- Atualizar triggers para popular `team_id` ao inserir
- Nova RLS policy: membros só veem atividades de seus grupos

### Item 4 - Notificações por email e push

**Proposta:**
1. Atualizar a edge function `send-notification` para disparar emails via Resend quando:
   - Membro recebe nova indicação
   - Membro recebe novo depoimento
   - Negócio fechado a partir de indicação do membro
   - Convidado preenche cadastro (notifica o membro que convidou)

2. Integrar push notifications (já existe `usePushNotifications`) com os mesmos eventos
3. Respeitar as preferências de `/configuracoes` (verificar se os toggles realmente funcionam)

### Item 8 (continuação) - Revisar configurações de notificações

- Verificar se as flags `notify_on_testimonial`, `notify_on_referral`, `notify_on_meeting` são efetivamente consultadas antes de enviar
- Adicionar novas flags: `notify_on_business_deal`, `notify_on_guest_signup`

**Arquivos afetados:** Nova página `Feed.tsx`, `Header.tsx`, `ActivityFeed.tsx`, `useActivityFeed.ts`, `Configuracoes.tsx`, edge functions, migration SQL

---

## Fase 4: Conteúdo e Dados (Itens 3, 5, 7, 10, 11)

### Item 3 - Acesso a convidados por encontro

**Proposta:**
- Remodelar a página `/encontros` para incluir uma seção expansível em cada encontro passado mostrando os **convidados que participaram**
- Buscar convidados via: usuários com role `convidado` que têm registro em `attendances` para aquele `meeting_id`
- Nome do convidado é um link para `/membro/:slug` (perfil)
- Acesso restrito: membros/facilitadores/admin (convidados não veem)

**Arquivos afetados:** `Encontros.tsx`, possivelmente novo componente `MeetingGuestsList.tsx`

### Item 5 - Mesclar Membros e Grupos

**Proposta:**
- Unificar `/membros` e `/equipes` em uma única página `/membros`
- A página já agrupa por grupo (seções expansíveis). Adicionar:
  - Estatísticas resumidas por grupo (total membros, facilitadores) no cabeçalho de cada seção
  - Info de facilitadores com badge especial
  - Descrição do grupo visível
- Remover `/equipes` do menu e redirecionar para `/membros`
- Manter a rota `/equipes` com redirect para compatibilidade

**Arquivos afetados:** `Membros.tsx` (enriquecer), `Equipes.tsx` (redirect), `Sidebar.tsx`

### Item 7 - Status da indicação (Frio/Morno/Quente)

**Proposta:**
- Adicionar coluna `status` (TEXT, default 'morno') na tabela `referrals`
- Valores: `frio`, `morno`, `quente`
- No formulário de indicação, adicionar seletor visual com 3 opções coloridas:
  - Frio: azul (#3b82f6)
  - Morno: laranja (#f59e0b)
  - Quente: vermelho (#ef4444)
- Na listagem, cada card de indicação terá borda/badge colorido conforme status
- Quem recebeu pode atualizar o status

**Arquivos afetados:** `Indicacoes.tsx`, `useReferrals.ts`, migration SQL

### Item 10 - Controle de convites

**Proposta:**
- Adicionar botão de **excluir** convite pendente (já existe `deleteInvitation` no hook mas não está no UI)
- Corrigir expiração: criar uma função scheduled (cron) ou verificar no frontend se `expires_at < now()` e marcar como expirado
- Adicionar migration para atualizar convites antigos que já passaram de 30 dias

**Arquivos afetados:** `Convites.tsx`, `useInvitations.ts`, migration SQL

### Item 11 - Histórico de pontos funcional

**Proposta:**
- O `PointsHistoryCard` já existe mas depende de dados na tabela `points_history` que podem estar vazios para o sistema mensal
- Atualizar os triggers para popular `points_history` com contexto mensal ao recalcular
- Adicionar `PointsHistoryCard` na página `Profile.tsx` (perfil do próprio usuário)
- Investigar por que alguns usuários estão com pontos zerados (provavelmente não pertencem a nenhum grupo ou não têm atividades no mês corrente)

**Arquivos afetados:** `Profile.tsx`, `PointsHistoryCard.tsx`, migration SQL para popular histórico

---

## Fase 5: Perfil e Estatísticas (Itens 14, 15, 16)

### Item 14 - Redesign da página de perfil

**Proposta** (baseada no print mencionado, com melhorias sugeridas):
- Adicionar ao perfil do membro (próprio e de terceiros):
  - **Resumo de atividades do mês:** mini-cards com contadores
  - **Grupos a que pertence:** badges coloridos
  - **Abas de conteúdo:**
    - "Sobre" (bio, contato, links)
    - "Atividades" (timeline de ações recentes)
    - "Estatísticas" (gráfico de evolução mensal)
    - "Depoimentos" (recebidos/enviados)
  - **Badges de conquistas:** Top 3 do mês, streak de presenças, etc.

**Arquivos afetados:** `Profile.tsx`, `MemberProfile.tsx`, novos componentes de abas

### Item 15 - Melhorias em Estatísticas

**Proposta:**
1. **"Minhas Estatísticas":**
   - Corrigir Gente em Ação em branco (provavelmente `useStats` não busca dados corretamente)
   - Adicionar filtro por mês
   - Incluir todas as atividades com detalhamento

2. **"Comunidade":**
   - Adicionar sub-abas: "Global" e uma por grupo
   - Estatísticas separadas por período (mês a mês)
   - Incluir todas as métricas: Gente em Ação, Depoimentos, Indicações, Negócios, Presenças
   - Para admin: dados completos de todos os membros

**Arquivos afetados:** `Estatisticas.tsx`, `useStats.ts`, novos hooks

### Item 16 - Visibilidade de atividades dos colegas

**Proposta:**
- Dentro do perfil de cada membro (visível para colegas de grupo):
  - Aba "Atividades" com histórico de Gente em Ação, Negócios, Depoimentos e Indicações
  - Dados detalhados mas respeitando privacidade (valores de negócios podem ser omitidos)
- No Feed de Atividades (item 8), as atividades dos colegas já estarão visíveis

**Arquivos afetados:** `MemberProfile.tsx`, novo hook `useMemberActivities.ts`

---

## Fase 6: Integrações e Correções (Itens 6, 9)

### Item 9 - RD Station capturando login

**Diagnóstico:** O script RD Station em `index.html` captura todos os formulários. A página `/auth` tem formulários de login E cadastro.

**Proposta:**
- Verificar se o atributo `data-rd-no-capture='true'` está no formulário de login em `Auth.tsx`
- Garantir que APENAS o formulário de cadastro (signup) está sendo capturado
- Adicionar `data-rd-no-capture='true'` em todos os outros formulários da plataforma (perfil, indicações, etc.)

**Arquivos afetados:** `Auth.tsx`, possíveis outros formulários

### Item 6 - Conselho de Administração 24/7 (Help Desk)

**Opções de implementação:**

| Opção | Descrição | Complexidade |
|-------|-----------|-------------|
| **A - Fórum interno** | Nova tabela `forum_posts` com categorias, respostas e upvotes. Página `/conselho` com threads. Membros podem criar tópicos e responder. | Média-Alta |
| **B - Canal de discussão** | Estilo chat assíncrono com canais por tema. Mais simples que fórum, similar a um Slack simplificado. | Alta |
| **C - Quadro de solicitações** | Estilo Kanban com cards de "problemas/pedidos" que membros podem criar e outros podem comentar/oferecer ajuda. Status: Aberto, Em andamento, Resolvido. | Média |
| **D - Integração externa** | Usar WhatsApp Community ou grupo do Telegram, com link direto da plataforma. Zero desenvolvimento. | Baixa |

**Recomendação:** Opção **A (Fórum interno)** ou **C (Quadro de solicitações)**, pois mantém tudo dentro da plataforma e gera mais engajamento. Sugiro começar com a opção C por ser mais simples e visual, podendo evoluir para fórum depois.

**Estrutura para Opção C:**
```text
help_requests
- id, user_id, title, description, category
- status (aberto, em_andamento, resolvido)
- created_at, resolved_at

help_responses  
- id, request_id, user_id, content, created_at
```

---

## Documentação (Transversal)

Após cada fase:
- Atualizar `docs/TECHNICAL_DOCUMENTATION.md`
- Atualizar `docs/USER_FLOWS.md`
- Atualizar `/documentacao` (página interna)
- Adicionar entrada no changelog (tabela `system_changelog`)
- Versão sugerida: **v3.0.0** (dado o escopo das mudanças)

---

## Ordem de Implementação Recomendada

```text
Fase 1 (Papéis)     ████████░░░░░░░░  ~4 ciclos
Fase 4 (Dados)       ████████░░░░░░░░  ~4 ciclos  
Fase 2 (Mobile)      ██████░░░░░░░░░░  ~3 ciclos
Fase 3 (Feed/Notif)  ██████░░░░░░░░░░  ~3 ciclos
Fase 5 (Perfil/Stats)████████░░░░░░░░  ~4 ciclos
Fase 6 (Integ/Extra) ████░░░░░░░░░░░░  ~2 ciclos
```

Fases 1 e 4 são prioritárias porque estabelecem a base para as demais. Item 9 (RD Station) é uma correção rápida que pode ser feita em qualquer momento.

---

## Considerações Importantes

1. **Impacto para usuários existentes:** As mudanças nos papéis (admin não lança, facilitador não pontua) mudam a dinâmica atual. Recomendo comunicar aos usuários antes de ativar.

2. **Performance:** Com visões administrativas mostrando todos os registros, será importante implementar paginação server-side e não carregar tudo de uma vez.

3. **Testes:** Após cada fase, validar os fluxos em mobile e desktop, testando com diferentes roles (admin, facilitador, membro, convidado).

4. **Backward compatibility:** Manter rotas antigas com redirects (ex: `/equipes` -> `/membros`).

