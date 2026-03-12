# Plano de Evolução v3.0.0 -- Gente Networking (Revisado)

19 itens organizados em 8 blocos por dependência. Estimativa: ~28 ciclos de implementação.

---

## Bloco 1: Correções Rápidas (Itens 9, 10, 7)

**Item 9 -- RD Station capturando login**
O form de login em `Auth.tsx` (linha 309) já tem `data-rd-no-capture="true"`. Preciso verificar se outros forms internos (perfil, indicações, negócios, depoimentos, etc.) também estão protegidos. Adicionarei `data-rd-no-capture="true"` em TODOS os formulários internos da plataforma. Apenas o form de signup (linha 390) ficará sem essa proteção.

**Item 10 -- Controle de convites**

- A tabela `invitations` não tem RLS para DELETE. Criar policy para o dono excluir seus convites pendentes.
- O hook `useInvitations` já tem `deleteInvitation` mas a UI em `Convites.tsx` precisa expor o botão de exclusão.
- Corrigir expiração: no frontend, comparar `expires_at < now()` e marcar visualmente como expirado. Migration para marcar convites antigos como `expired`.

**Item 7 -- Status da indicação**

- Migration: `ALTER TABLE referrals ADD COLUMN status TEXT DEFAULT 'morno'`.
- Seletor visual no formulário com 3 opções: Frio (azul `#3b82f6`), Morno (laranja `#f59e0b`), Quente (vermelho `#ef4444`).
- Badge colorido nos cards. Destinatário pode atualizar o status.

---

## Bloco 2: Papéis e Permissões (Itens 1a, 1b, 13)

**Item 1a -- Admin com visão de gestão**
Cada página de atividade exibirá visão condicional via `useAdmin()`:

- **Membro/Facilitador:** formulário + listagem pessoal (atual)
- **Admin:** painel de gestão com tabela completa + filtros (grupo, período, membro). Sem formulário de criação (exceto Conteúdos).

Páginas afetadas: `GenteEmAcao.tsx`, `Depoimentos.tsx`, `Indicacoes.tsx`, `Negocios.tsx`, `Convites.tsx`, `Encontros.tsx`.

Admin excluído da gamificação: alterar `calculate_monthly_points_for_team` para retornar 0 se o user tem role `admin`. Filtrar admin de `get_monthly_ranking`.

Estatísticas para admin: substituir "Minhas Estatísticas" por "Relatório Geral" com dados globais filtráveis.

**Item 1b -- Facilitador sem pontuação**
Mesma abordagem: `calculate_monthly_points_for_team` retorna 0 se role = `facilitador`. Facilitador continua lançando atividades normalmente mas não aparece nos rankings.

**Item 13 -- Admin CRUD total**

- Novas RLS policies para admin fazer UPDATE/DELETE em `gente_em_acao`, `testimonials`, `referrals`, `business_deals`, `invitations`, `profiles`.
- Botões de editar/excluir nas visões administrativas.
- Novo item no menu: **"Gestão de Registros"** (`/admin/registros`) com abas por tipo de atividade, filtros por grupo/membro/período, e ações de edição/exclusão.

**Recomendação técnica:** Centralizar a lógica de visão admin em um componente wrapper `AdminDataTable` reutilizável com filtros, paginação server-side (`.range()`) e ações CRUD, evitando duplicar código em cada página.

---

## Bloco 3: Mobile e UX (Item 2)

**Bottom Navigation Bar** (`BottomNav.tsx`): fixo na parte inferior, visível apenas em telas < 768px. Customizado por role:

- **Membro:** Gente em Ação, Negócios, Indicações, Convites, Perfil
- **Admin:** Dashboard, Gestão de Pessoas, Admin, Ranking
- **Facilitador:** Admin, Gestão de Pessoas, Encontros, Estatísticas

**Ajustes globais:**

- `MainLayout.tsx`: adicionar `pb-20` no mobile para espaçar o conteúdo do bottom nav.
- Dashboard mobile: cards de ação rápida em grid 2x2 com ícones grandes (role-specific).
- Revisar tabelas/grids em todas as páginas para telas pequenas.
- Adicionar `safe-area-inset-bottom` para iPhones com notch (já há `viewport-fit=cover` no HTML).

---

## Bloco 4: Feed de Atividades e Notificações (Itens 4, 8, 12)

**Item 8 -- Feed de Atividades**

- Nova página `/feed` com listagem detalhada + filtros por grupo, tipo e período.
- Migration: `ALTER TABLE activity_feed ADD COLUMN team_id UUID REFERENCES teams(id)`. Atualizar triggers (`handle_*_insert`) para popular `team_id`.
- RLS: membros só veem atividades de colegas do mesmo grupo (via `are_same_team` ou `team_id` direto).
- Cada item clicável expande detalhes do lançamento.
- Header (sininho): ao clicar, redirecionar para `/feed`.
- Index (Atividades Recentes): manter resumo com link "Ver todas" para `/feed`.

**Item 12 -- Dashboard admin + KPIs**

- Conectar bloco "Atividades Recentes" do `AdminDashboard.tsx` ao `useActivityFeed` (hoje o bloco existe mas está vazio porque `activity_feed` pode não ter dados ou o hook não está sendo chamado corretamente).
- Adicionar KPIs com filtro por grupo:
  - % presença por Encontro e Geral (por Grupo e Comunidade)
  - Total Gente em Ação por Grupo
  - Total Indicações Recebidas/Dadas por Grupo
  - Total Negócios e R$ por Grupo
  - Acumulado R$ Negócios por ano e desde o início de cada Grupo
- Facilitador acessa apenas dados do seu grupo (filtro via `get_user_teams`).

**Item 4 -- Notificações email + push**

- Atualizar edge function `send-notification` para disparar em: indicação recebida, depoimento recebido, negócio fechado de indicação, convidado preenche cadastro.
- Templates de email personalizados com identidade visual do Gente (logo, cores `#1e3a5f`).
- Integrar push via `usePushNotifications` existente nos mesmos eventos.
- Adicionar novas flags no profile: `notify_on_business_deal`, `notify_on_guest_signup`.
- Revisar se os toggles em `Configuracoes.tsx` realmente são consultados pela edge function (atualmente `send-notification` já verifica `email_notifications_enabled`, `notify_on_testimonial`, `notify_on_referral`).

---

## Bloco 5: Membros, Convidados e Encontros (Itens 3, 5, 17)

**Item 5 -- Mesclar Membros e Grupos**

- Unificar `/membros` e `/equipes` em `/membros`. Incorporar stats de grupo no cabeçalho de cada seção.
- **Facilitadores diferenciados:** card com borda âmbar/dourada + badge "Facilitador" com ícone de selo.
- Remover `/equipes` do menu, manter rota com redirect.

**Item 3 -- Convidados por encontro**

- Remodelar `/encontros`: seção expansível em cada encontro passado listando convidados presentes.
- Query: `attendances` JOIN `user_roles` (role=convidado) para identificar quais participantes são convidados.
- Nome do convidado como link para `/membro/:slug`.
- Oculto para usuários com role `convidado`.

**Item 17 -- Ordenação e destaque de eventos**

- Ordenar encontros por `meeting_date` ASC (próximos primeiro).
- Quando faltar <= 7 dias: borda colorida (primária), badge "Em breve", posição de destaque.
- Aplicar mesma mecânica na `GuestWelcome.tsx`.

---

## Bloco 6: Perfil Redesenhado e Cases (Itens 11, 14, 16, 18)

**Item 11 -- Histórico de pontos funcional**
O problema: `points_history` é populado apenas por `update_user_points_and_rank` (sistema legado global), mas o sistema mensal (`update_monthly_points_for_team`) NÃO insere em `points_history`. Solução: alterar `update_monthly_points_for_team` para inserir diff quando pontos mudam.

- Adicionar `PointsHistoryCard` em `Profile.tsx` (perfil próprio -- hoje só aparece em `MemberProfile.tsx`).
- Investigar pontos zerados: provavelmente membros sem grupo ou recálculo não executado para o mês corrente.

**Item 14 -- Redesign do perfil (baseado no print)**
O print mostra campos adicionais que não existem hoje:

- **Tags/Habilidades:** novo campo `tags TEXT[]` em `profiles`. UI com chips coloridos.
- **Seção "Apresentação":** novos campos `what_i_do TEXT`, `ideal_client TEXT`, `how_to_refer TEXT` em `profiles`.
- **Gerador de Pitch IA:** edge function `generate-pitch` usando Lovable AI (LOVABLE_API_KEY já disponível). Captura dados do perfil (nome, empresa, cargo, bio, tags, what_i_do, ideal_client, how_to_refer) e gera texto de pitch completo. Botão "Gerar Pitch" no perfil do próprio usuário.
- Reorganizar: Informações Básicas > Tags > Contato & Redes > Apresentação (O que faço / Cliente ideal / Como me indicar) > Pitch gerado > Estatísticas > Histórico de Pontos.

**Item 16 -- Visibilidade de atividades dos colegas**

- Adicionar abas no `MemberProfile.tsx`:
  - "Sobre" (bio, contato, links -- atual)
  - "Atividades" (Gente em Ação, Negócios, Depoimentos, Indicações do membro)
  - "Estatísticas" (gráfico de evolução mensal)
- Dados visíveis apenas para membros do mesmo grupo (verificação via `are_same_team`).

**Item 18 -- Cases de negócio no perfil**

- Nova tabela `business_cases`: `id, user_id, business_deal_id (FK), title, description, referrer_type ('membro'|'convidado'), referrer_member_id, referrer_guest_name, created_at`.
- Bloco slider no perfil usando Embla Carousel (já instalado): até 3 cards visíveis, rotação automática.
- Fluxo: membro registra negócio primeiro, depois pode criar case vinculado.
- **Pontuação:** 15 pts para quem registra o case, 20 pts para quem indicou.
- Atualizar `calculate_monthly_points_for_team`, `ScoringRulesCard`, info de pontuação na Index e na documentação.
- Cases exibidos no feed de atividades (novo trigger `handle_business_case_insert`).

---

## Bloco 7: Estatísticas e Conselho 24/7 (Itens 6, 15)

**Item 15 -- Estatísticas completas**

- **"Minhas Estatísticas":** corrigir Gente em Ação em branco (o `useStats` busca dados sem filtro de período, mas o valor `genteEmAcao.total` deve funcionar -- investigar se o `ga.length` está retornando 0 por falta de dados ou bug na query). Adicionar filtro por mês. Garantir que TODAS as atividades sejam exibidas: Gente em Ação, Depoimentos, Indicações, Negócios, Presenças, Convites, Cases, Conselho.
- **"Comunidade":** sub-abas "Global" + uma por grupo. Estatísticas separadas por mês. Para admin: substituir "Minhas Estatísticas" por "Relatório Geral" (link com item 1a).

**Item 6 -- Conselho de Administração 24/7**

Implementação recomendada: **Quadro de Solicitações (Kanban simplificado)**.

Novas tabelas:

```
help_requests: id UUID, user_id UUID, title TEXT, description TEXT, 
  category TEXT, status TEXT ('aberto'|'em_andamento'|'resolvido'),
  team_id UUID, created_at, resolved_at

help_responses: id UUID, request_id UUID (FK), user_id UUID, 
  content TEXT, created_at
```

- Nova página `/conselho` com 3 colunas: Aberto, Em Andamento, Resolvido.
- Membros criam cards de problemas/dúvidas com categoria.
- Outros membros respondem/comentam.
- **Pontuação:** 5 pts para quem responde (não para quem criou).
- Atualizar `calculate_monthly_points_for_team` para contar respostas.
- Atualizar `ScoringRulesCard` e toda informação de pontuação na plataforma.
- Trigger para popular `activity_feed` em cada novo request e response.
- RLS: membros veem solicitações de colegas do mesmo grupo.
- Nova entrada no menu sidebar.

**Sugestão de melhoria:** Permitir que o criador marque uma resposta como "melhor resposta", concedendo +5 pontos adicionais ao autor da melhor resposta. Isso incentiva respostas de qualidade. **APROVADO!**

---

## Bloco 8: Performance, Cloudflare e Documentação (Item 19 + transversal)

**Item 19 -- Análise de performance e Cloudflare**

Análise da stack atual:

- Deploy via Cloudflare Pages (estático). Supabase como backend. PWA com Workbox.
- O `vite.config.ts` já tem caching Workbox para Supabase API (NetworkFirst, 24h), fonts (CacheFirst, 1 ano), imagens (CacheFirst, 30 dias).

Recomendações:

1. **Cloudflare Cache Rules:** Configurar cache headers para assets estáticos (JS/CSS/imagens) com `immutable` e `max-age=31536000`. Cloudflare Pages já faz isso automaticamente para hashed assets.
2. **Cloudflare Web Analytics:** Ativar analytics real-user (RUM) gratuito para monitorar Core Web Vitals (LCP, FID, CLS). Basta adicionar o snippet JS no `index.html`.
3. **Cloudflare Turnstile:** Substituir ou complementar validação de formulários com CAPTCHA invisível do Cloudflare (gratuito) para proteger o formulário de cadastro.
4. **Edge caching de API:** Usar Cloudflare Workers como proxy para endpoints Supabase de leitura frequente (ranking, membros). Cache de 5-15 min no edge reduz latência e carga no Supabase.
5. **Image optimization:** Se imagens de avatar/banner forem grandes, configurar Cloudflare Image Resizing para servir versões otimizadas (WebP, tamanho adequado).
6. **Lazy loading de rotas:** Implementar `React.lazy()` + `Suspense` para carregar páginas sob demanda, reduzindo o bundle inicial.
7. **Prefetch de dados críticos:** Usar `queryClient.prefetchQuery` no `MainLayout` para pré-carregar perfil e stats enquanto a UI renderiza.

**Documentação (transversal)**
Após cada bloco:

- Atualizar `docs/TECHNICAL_DOCUMENTATION.md`
- Atualizar `docs/USER_FLOWS.md`
- Atualizar `/documentacao` (página interna)
- Inserir entrada no `system_changelog` (v3.0.0)

---

## Tabela de pontuação atualizada (após todos os blocos)


| Atividade                       | Pontos                                  |
| ------------------------------- | --------------------------------------- |
| Gente em Ação                   | 25 pts                                  |
| Depoimento dado                 | 15 pts                                  |
| Indicação feita                 | 20 pts                                  |
| Presença em encontro            | 20 pts                                  |
| Negócio fechado                 | 5 pts / R$100                           |
| Convidado presente              | 15 pts                                  |
| **Case de negócio (novo)**      | **15 pts (autor) + 20 pts (indicador)** |
| **Resposta no Conselho (novo)** | **5 pts**                               |


Admin e Facilitador: 0 pts (excluídos da gamificação).

---

## Ordem de implementação

```text
Bloco 1 (Correções rápidas)      ██░░░░░░░░  ~2 ciclos
Bloco 2 (Papéis/Permissões)      █████░░░░░  ~5 ciclos
Bloco 3 (Mobile)                 ███░░░░░░░  ~3 ciclos
Bloco 5 (Membros/Convidados)     ███░░░░░░░  ~3 ciclos
Bloco 4 (Feed/Notificações)      ████░░░░░░  ~4 ciclos
Bloco 6 (Perfil/Cases)           ██████░░░░  ~6 ciclos
Bloco 7 (Stats/Conselho)         ████░░░░░░  ~4 ciclos
Bloco 8 (Perf/Docs)              █░░░░░░░░░  ~1 ciclo
```