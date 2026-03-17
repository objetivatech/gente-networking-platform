# Documentação Técnica - Gente Networking

> **Última atualização:** 2026-03-17
> **Versão:** 3.2.0

## Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Rotas e Páginas](#rotas-e-páginas)
5. [Componentes](#componentes)
6. [Hooks Customizados](#hooks-customizados)
7. [Autenticação](#autenticação)
8. [Sistema de Pontuação](#sistema-de-pontuação)
9. [Banco de Dados](#banco-de-dados)
10. [Edge Functions](#edge-functions)
11. [Integrações](#integrações)
12. [PWA](#pwa)
13. [Sistema de Roles e Permissões](#sistema-de-roles-e-permissões)
14. [Feed de Atividades](#feed-de-atividades)
15. [Dashboard Administrativo](#dashboard-administrativo)
16. [Mobile UX](#mobile-ux)
17. [Conselho 24/7](#conselho-247)
18. [Cases de Negócio](#cases-de-negócio)
19. [Perfil v3](#perfil-v3)
20. [Segurança e Performance (Cloudflare)](#segurança-e-performance-cloudflare)

---

## Visão Geral

O **Gente Networking** é uma plataforma de gestão de comunidade de networking profissional. O sistema permite:

- Gerenciamento de grupos e membros com 4 perfis de usuário (Admin, Facilitador, Membro, Convidado)
- Registro de atividades de networking (Gente em Ação, Depoimentos, Indicações, Negócios)
- Sistema de gamificação com pontos mensais por grupo e ranks
- Conselho 24/7 — help desk interno com pontuação por respostas
- Cases de Negócio — registro de cases vinculados a negócios fechados
- Calendário de encontros quinzenais
- Convites personalizados com email automático
- Dashboard de estatísticas com KPIs por grupo
- Feed de atividades com filtros avançados
- Notificações por email (Resend) e push (local)
- **Sistema de privacidade por grupo**: Membros só visualizam informações de outros membros do mesmo grupo
- Navegação mobile otimizada com BottomNav por role
- Perfil v3 com tags, pitch IA e abas (Sobre, Atividades, Estatísticas, Cases)
- Proteção anti-bot via Cloudflare Turnstile no cadastro de convidados
- Cloudflare Web Analytics para monitoramento de Core Web Vitals

---

## Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| React 18 | Framework frontend |
| TypeScript | Tipagem estática |
| Vite | Build tool |
| Tailwind CSS | Estilização |
| Shadcn/UI | Componentes UI |
| React Query | Cache e estado servidor |
| React Router DOM | Roteamento |
| Recharts | Visualização de dados |
| Zod | Validação de schemas |
| Supabase | Backend (Auth, Database, Edge Functions, Realtime) |
| Resend | Envio de emails |
| Cloudflare Pages | Hosting e CDN |
| Cloudflare Turnstile | Proteção anti-bot |
| Cloudflare Web Analytics | Métricas RUM e Core Web Vitals |

---

## Estrutura do Projeto

```
src/
├── assets/              # Imagens e recursos estáticos
├── components/          # Componentes React
│   ├── layout/          # Layout (Header, Sidebar, MainLayout, BottomNav, Footer)
│   └── ui/              # Componentes Shadcn/UI
├── contexts/            # Contextos React (AuthContext)
├── hooks/               # Hooks customizados
├── integrations/        # Integrações externas (Supabase)
├── lib/                 # Utilitários (utils.ts, date-utils.ts)
├── pages/               # Páginas/Rotas
└── index.css            # Estilos globais e tema

supabase/
├── functions/           # Edge Functions
│   ├── _shared/         # Código compartilhado (email-templates)
│   ├── birthday-notifications/ # Notificações de aniversários
│   ├── send-email/      # Envio de emails
│   ├── send-notification/ # Notificações (depoimentos, indicações, convites, etc.)
│   └── verify-turnstile/ # Verificação anti-bot Cloudflare Turnstile
└── migrations/          # Migrações SQL

docs/
├── CLOUDFLARE_PAGES_DEPLOY.md
├── CLOUDFLARE_ENV_SETUP.md
├── PWA_IMPLEMENTATION.md
├── USER_FLOWS.md
├── DOCUMENTATION_UPDATE_GUIDE.md
└── TECHNICAL_DOCUMENTATION.md (este arquivo)
```

---

## Rotas e Páginas

### Públicas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/auth` | `Auth.tsx` | Login, cadastro e recuperação de senha |
| `/redefinir-senha` | `RedefinirSenha.tsx` | Redefinição de senha |
| `/convite/:code` | `ConvitePublico.tsx` | Página pública de convite |
| `/convite/:code/cadastrar` | `CadastroConvidado.tsx` | Cadastro via convite (com Turnstile) |
| `/instalar` | `Instalar.tsx` | Instruções de instalação PWA |

### Autenticadas

| Rota | Arquivo | Descrição | Acesso |
|------|---------|-----------|--------|
| `/` | `Index.tsx` | Dashboard com feed de atividades | Todos |
| `/feed` | `Feed.tsx` | Feed completo com filtros (tipo, período, grupo) | Membros+ |
| `/perfil` | `Profile.tsx` | Perfil com histórico de pontos, abas e pitch IA | Todos |
| `/membros` | `Membros.tsx` | Diretório de membros com filtros e exportação | Membros+ |
| `/membro/:slug` | `MemberProfile.tsx` | Perfil individual com URL amigável e abas | Membros+ |
| `/aniversarios` | `Aniversarios.tsx` | Calendário de aniversários | Membros+ |
| `/ranking` | `Ranking.tsx` | Ranking mensal por grupo | Membros+ |
| `/gente-em-acao` | `GenteEmAcao.tsx` | Reuniões 1-a-1 | Membros+ |
| `/depoimentos` | `Depoimentos.tsx` | Envio de depoimentos | Membros+ |
| `/indicacoes` | `Indicacoes.tsx` | Indicações com status (frio/morno/quente) | Membros+ |
| `/negocios` | `Negocios.tsx` | Registro de negócios | Membros+ |
| `/encontros` | `Encontros.tsx` | Calendário de encontros (ordenado, destaque "Em breve") | Membros+ |
| `/convites` | `Convites.tsx` | Gerenciamento de convites (expiração, exclusão) | Membros+ |
| `/conselho` | `Conselho.tsx` | Conselho 24/7 — help desk Kanban | Membros+ |
| `/equipes` | `Equipes.tsx` | Gestão de grupos | Admin/Facilitador |
| `/estatisticas` | `Estatisticas.tsx` | Gráficos e métricas | Membros+ |
| `/conteudos` | `Conteudos.tsx` | Materiais educativos | Membros+ |
| `/changelog` | `Changelog.tsx` | Histórico de versões | Membros+ |
| `/documentacao` | `Documentacao.tsx` | Documentação do sistema (filtrada por role) | Membros+ |
| `/configuracoes` | `Configuracoes.tsx` | Configurações e preferências de notificação | Todos |

### Administrativas

| Rota | Arquivo | Descrição | Acesso |
|------|---------|-----------|--------|
| `/dashboard` | `AdminDashboard.tsx` | Dashboard com KPIs, gráficos e métricas | Admin/Facilitador |
| `/admin` | `Admin.tsx` | Painel administrativo | Admin/Facilitador |
| `/admin/pessoas` | `GestaoPessoas.tsx` | Gestão unificada de Membros/Convidados/Inativos | Admin/Facilitador |
| `/admin/registros` | `AdminRegistros.tsx` | Gestão CRUD de registros (todas as tabelas) | Admin |
| `/admin/convidados` | `GestaoConvidados.tsx` | Gestão de convidados por encontro | Admin/Facilitador |

---

## Componentes

### Layout

| Componente | Descrição |
|------------|-----------|
| `MainLayout` | Layout principal com sidebar, header e bottom nav |
| `Header` | Cabeçalho com navegação, sininho de notificações e perfil |
| `Sidebar` | Menu lateral com navegação filtrada por role |
| `BottomNav` | Navegação mobile inferior com atalhos por role (< 768px) |
| `Footer` | Rodapé |

### Funcionalidades

| Componente | Descrição |
|------------|-----------|
| `ActivityFeed` | Feed de atividades em tempo real (dashboard) |
| `MonthlyPointsSummary` | Resumo de pontos mensais por grupo |
| `MonthlyPointsEvolutionChart` | Gráfico de evolução mensal |
| `PointsEvolutionChart` | Gráfico de evolução de pontos |
| `PointsHistoryCard` | Card com histórico de pontos |
| `RankBadge` | Badge visual do rank |
| `MemberSelect` | Seletor de membros |
| `ScoringRulesCard` | Regras de pontuação (atualizado com Conselho e Cases) |
| `AdminDataView` | Visualização de dados administrativos com filtros e CRUD |
| `NotificationSettings` | Configurações de notificação por tipo |
| `PasswordStrengthIndicator` | Indicador visual de força da senha |
| `OfflineIndicator` | Indicador de modo offline |
| `PWAInstallPrompt` | Prompt de instalação PWA |
| `CloudflareTurnstile` | Widget anti-bot Cloudflare no cadastro |

---

## Hooks Customizados

| Hook | Descrição |
|------|-----------|
| `useAuth` | Autenticação (login, signup, logout, resetPassword) |
| `useAdmin` | Verificação de roles (isAdmin, isFacilitator, isMember, isGuest) |
| `useProfile` | Dados do perfil do usuário |
| `useMembers` | Lista de membros |
| `useTeams` | Gestão de grupos |
| `useMeetings` | Encontros e presenças |
| `useGenteEmAcao` | Reuniões 1-a-1 |
| `useTestimonials` | Depoimentos |
| `useReferrals` | Indicações (com status frio/morno/quente) |
| `useBusinessDeals` | Negócios |
| `useBusinessCases` | Cases de negócio (registro e listagem) |
| `useCouncil` | Conselho 24/7 (posts, respostas, melhor resposta) |
| `useInvitations` | Convites |
| `useRanking` | Ranking geral |
| `useMonthlyRanking` | Rankings mensais por grupo |
| `useMonthlyPoints` | Pontos do usuário no mês/grupo |
| `useStats` | Estatísticas gerais |
| `usePointsHistory` | Histórico de pontos |
| `useActivityFeed` | Feed de atividades com realtime |
| `useRealtimeActivity` | Subscrição realtime do feed |
| `useAdminDashboard` | Stats, KPIs, gráficos para o dashboard admin |
| `useAdminData` | Dados administrativos para gestão de registros |
| `useAdminGuests` | Gestão de convidados |
| `usePromoteGuest` | Promoção de convidados para membros |
| `useContents` | Conteúdos educativos |
| `useOfflineData` | Cache offline |
| `usePWAInstall` | Instalação PWA |
| `usePushNotifications` | Notificações push locais |
| `useGuestData` | Dados de convidados |

---

## Autenticação

### Fluxo de Login

1. Usuário acessa `/auth`
2. Insere email e senha
3. `signIn()` chama `supabase.auth.signInWithPassword()`
4. Sucesso: redirect para `/`
5. Erro: exibe toast

### Fluxo de Cadastro (via Convite)

1. Convidado acessa `/convite/:code/cadastrar`
2. Preenche: Nome, Email, WhatsApp, Empresa, Segmento, Senha
3. Validação frontend com Zod
4. **Cloudflare Turnstile**: Widget anti-bot deve ser resolvido antes do envio
5. **Verificação server-side**: Token Turnstile é validado via Edge Function `verify-turnstile`
6. Verificação de email duplicado via `profiles`
7. `signUp()` cria usuário com metadata
8. Trigger `handle_new_user()` cria perfil
9. `accept_invitation()` vincula o convite ao novo usuário
10. Role `convidado` é atribuída

### Roles

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total. Dashboard, gestão global, CRUD de registros. **Não pontua.** |
| `facilitador` | Gerencia seu grupo. Promove convidados, gerencia presenças. **Não pontua.** |
| `membro` | Participa de atividades. Registra eventos, cria convites. **Pontua.** |
| `convidado` | Acesso limitado. Aguarda promoção após primeiro encontro |

---

## Sistema de Pontuação Mensal

### Regras

| Atividade | Pontos | Contexto de Grupo |
|-----------|--------|-------------------|
| Gente em Ação | 25 pts | Grupo em comum com parceiro |
| Presença em Encontro | 20 pts | Grupo do encontro |
| Indicação | 20 pts | Grupo em comum com destinatário |
| Case de Negócio (indicador) | 20 pts | Grupos do membro que indicou o negócio |
| Depoimento | 15 pts | Grupo em comum com destinatário |
| Convite Aceito (com presença) | 15 pts | Grupos do convidador |
| Case de Negócio (autor) | 15 pts | Grupos do autor |
| Negócio | 5 pts / R$ 100 | Todos os grupos do usuário |
| Resposta no Conselho 24/7 | 5 pts | Grupo do tópico ou global |
| Melhor Resposta no Conselho | +5 pts | Grupo do tópico ou global |

> **Nota:** Administradores e Facilitadores são **excluídos** da gamificação (0 pontos) e não aparecem nos rankings.

### Ranks

| Rank | Pontos |
|------|--------|
| 🌱 Iniciante | 0-49 |
| 🥉 Bronze | 50-149 |
| 🥈 Prata | 150-299 |
| 🥇 Ouro | 300-499 |
| 💎 Diamante | 500+ |

### Funções SQL

| Função | Descrição |
|--------|-----------|
| `get_current_year_month()` | Retorna "YYYY-MM" atual |
| `calculate_monthly_points_for_team()` | Calcula pontos por grupo/mês (inclui Council e Cases) |
| `update_monthly_points_for_team()` | Atualiza tabela monthly_points |
| `get_monthly_ranking()` | Ranking ordenado (exclui admin/facilitador) |
| `recalculate_all_monthly_points()` | Recalcula todos os usuários |
| `add_activity_feed()` | Insere no feed com team_id |

---

## Banco de Dados

**Supabase (PostgreSQL)** com Row Level Security (RLS).

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis (nome, empresa, pontos, rank, slug, tags, what_i_do, ideal_client, how_to_refer_me, preferências de notificação) |
| `user_roles` | Roles (admin, facilitador, membro, convidado) |
| `teams` | Grupos de networking |
| `team_members` | Membros dos grupos (is_facilitator) |
| `meetings` | Encontros (título, data, horário, local, team_id) |
| `attendances` | Presenças em encontros |
| `gente_em_acao` | Reuniões 1-a-1 (partner_id, guest_name, meeting_type) |
| `testimonials` | Depoimentos |
| `referrals` | Indicações (status: frio/morno/quente) |
| `business_deals` | Negócios (valor, referred_by) |
| `business_cases` | Cases de negócio (title, description, result, business_deal_id, image_url) |
| `council_posts` | Tópicos do Conselho 24/7 (title, description, status, team_id) |
| `council_replies` | Respostas no Conselho (content, is_best_answer) |
| `activity_feed` | Feed de atividades (com team_id para filtro por grupo) |
| `monthly_points` | Pontuação mensal por grupo |
| `points_history` | Histórico de pontos (team_id, year_month) |
| `contents` | Conteúdos educativos |
| `invitations` | Convites (code, status, expires_at, metadata) |
| `system_changelog` | Changelog do sistema |

### Funções de Privacidade e Segurança

| Função | Descrição |
|--------|-----------|
| `get_user_teams(user_id)` | Times do usuário |
| `are_same_team(user_id1, user_id2)` | Verifica mesmo time |
| `has_role(user_id, role)` | Verifica role (SECURITY DEFINER) |
| `is_team_facilitator(team_id, user_id)` | Verifica facilitador |
| `is_guest(user_id)` | Verifica convidado |
| `deactivate_member(member_id, reason)` | Desativa membro (SECURITY DEFINER) |
| `reactivate_member(member_id)` | Reativa membro (SECURITY DEFINER) |

---

## Edge Functions

### send-notification

Notificações por email para múltiplos tipos de eventos.

**Tipos suportados:** `testimonial`, `referral`, `welcome`, `invitation_accepted`, `guest_attended`, `invitation`

**Funcionalidades:**
- Respeita preferências de notificação do usuário (email_notifications_enabled, notify_on_testimonial, notify_on_referral)
- Templates HTML com identidade visual Gente Networking
- Envio via Resend API

### send-email

Envio de emails genéricos via Resend.

### birthday-notifications

Notificações automáticas de aniversários via cron job.

### verify-turnstile

Verificação server-side do token Cloudflare Turnstile para proteção anti-bot.

**Fluxo:**
1. Frontend resolve o desafio Turnstile e obtém token
2. Token é enviado para a Edge Function
3. Edge Function valida o token contra a API Cloudflare (`siteverify`)
4. Retorna `{ success: true/false }`

**Configuração:** `verify_jwt = false` (endpoint pré-autenticação)

---

## Conselho 24/7

### Descrição

Help desk interno em formato Kanban onde membros postam problemas de negócio e recebem ajuda de colegas.

### Status dos Tópicos

| Status | Descrição |
|--------|-----------|
| `aberto` | Tópico novo, aguardando respostas |
| `em_andamento` | Tópico em discussão |
| `resolvido` | Tópico resolvido |

### Pontuação

- **Quem responde:** +5 pontos por resposta
- **Melhor resposta:** +5 pontos adicionais (marcada pelo autor do tópico)
- **Quem cria o tópico:** não pontua

### Triggers

| Trigger | Ação |
|---------|------|
| `handle_council_reply_insert()` | Feed + recalcula pontos do respondente |
| `handle_best_answer_update()` | Recalcula pontos quando marcada como melhor resposta |

### Tabelas

- `council_posts` — Tópicos (title, description, status, team_id, user_id)
- `council_replies` — Respostas (content, is_best_answer, post_id, user_id)

---

## Cases de Negócio

### Descrição

Membros registram cases vinculados a negócios fechados. Exibidos como slider de cards no perfil.

### Pontuação

- **Autor do case:** +15 pontos
- **Membro que indicou o negócio original:** +20 pontos

### Fluxo

1. Membro registra negócio em `/negocios`
2. Membro acessa perfil e cria case vinculado ao negócio
3. Trigger insere no `activity_feed`
4. Pontos são recalculados para autor e indicador

### Tabela

`business_cases` — title, description, result, client_name, business_deal_id, image_url, user_id

### Exibição

- Slider de cards no perfil do membro (máximo 3 visíveis)
- Aparece na aba "Cases" do perfil individual (`/membro/:slug`)

---

## Perfil v3

### Novos Campos

| Campo | Descrição |
|-------|-----------|
| `tags` | Tags/habilidades (array de strings) |
| `what_i_do` | O que faço (texto livre) |
| `ideal_client` | Cliente ideal (texto livre) |
| `how_to_refer_me` | Como me indicar (texto livre) |

### Abas do Perfil

| Aba | Conteúdo |
|-----|----------|
| **Sobre** | Informações pessoais, empresa, bio, tags, what_i_do, ideal_client, how_to_refer_me |
| **Atividades** | Gente em Ação, Depoimentos, Indicações, Negócios do membro |
| **Estatísticas** | Pontos mensais, evolução, gráficos |
| **Cases** | Cases de negócio (slider de cards) |

### Gerador de Pitch via IA

Ferramenta que captura informações do perfil (nome, empresa, what_i_do, ideal_client, tags) e gera um texto de pitch profissional pronto para uso em apresentações.

---

## Segurança e Performance (Cloudflare)

### Cloudflare Turnstile (Anti-Bot)

- **Componente:** `CloudflareTurnstile.tsx`
- **Site Key:** Configurada no componente frontend
- **Secret Key:** Armazenada como secret no Supabase (`TURNSTILE_SECRET_KEY`)
- **Edge Function:** `verify-turnstile` (server-side validation)
- **Uso:** Formulário de cadastro de convidado (`CadastroConvidado.tsx`)

### Cloudflare Web Analytics

- **Token:** Configurado no `index.html` via beacon script
- **Métricas:** Core Web Vitals (LCP, FID, CLS), visitantes, page views
- **Plano:** Gratuito (incluído no Cloudflare)

### Cloudflare Pages (Hosting)

- Build automatizado via GitHub
- CDN global com cache automático
- SSL/HTTPS automático
- Preview deployments por PR
- Compressão Brotli/Gzip

### Cloudflare Worker — Supabase Proxy Cache (v3.0.0)

Worker de edge caching para endpoints REST de leitura frequente:

- **Código:** `cloudflare-worker/src/index.ts`
- **Configuração:** `cloudflare-worker/wrangler.toml`
- **Documentação completa:** `docs/CLOUDFLARE_WORKER_PROXY.md`

**Endpoints cacheados e TTLs:**

| Endpoint | TTL | Justificativa |
|----------|-----|---------------|
| `profiles` | 120s | Perfis mudam raramente |
| `teams` | 300s | Times quase nunca mudam |
| `team_members` | 120s | Mudanças são admin-only |
| `monthly_points` / `get_monthly_ranking` | 60s | Ranking é hot path |
| `system_changelog` | 600s | Raramente muda |
| `contents` | 300s | Conteúdos mudam pouco |
| `meetings` | 120s | Consultado frequentemente |

**Funcionalidades:**
- CORS restrito a origens autorizadas
- Headers de diagnóstico (`X-Cache: HIT/MISS/BYPASS`)
- Endpoint `/purge` para invalidação manual
- Health check em `/health`
- Stale-while-revalidate para respostas rápidas durante revalidação

**Deploy:** `cd cloudflare-worker && wrangler deploy`

---

## Feed de Atividades

### Página `/feed` (v3.0.0)

Feed completo com:
- **Filtro por tipo:** Gente em Ação, Depoimento, Negócio, Indicação, Presença, Convite, Convidado presente, Conselho
- **Filtro por período:** Este mês, mês passado, últimos 3/6 meses, todo o período
- **Filtro por grupo:** Filtra diretamente pela coluna `team_id` na tabela `activity_feed`
- **Itens clicáveis:** Abre dialog com detalhes completos (metadata, data formatada)
- **Realtime:** Novas atividades aparecem via Supabase Realtime

### Tabela `activity_feed`

Cada registro inclui `team_id` para filtro direto por grupo. Os triggers de inserção (handle_*_insert) populam automaticamente o `team_id` com base no contexto da atividade.

---

## Dashboard Administrativo

### KPIs (v3.0.0)

- **Stats gerais:** Total membros ativos, negócios (acumulado + anual), Gente em Ação, interações, convites
- **% Presença por encontro:** Barra visual com percentual e contagem por encontro
- **KPIs por grupo:** Tabela com membros, Gente em Ação, indicações, depoimentos e volume R$ por grupo
- **Gráfico de atividades mensais:** Últimos 6 meses (Gente em Ação, Depoimentos, Indicações)
- **Distribuição por rank:** Gráfico de pizza
- **Top 10 membros:** Ranking por pontuação
- **Métricas de convites:** Enviados, aceitos e presentes por membro
- **Atividades recentes:** Feed realtime

---

## Mobile UX

### BottomNav (v3.0.0)

Navegação inferior fixa visível apenas em telas < 768px com atalhos por role:

- **Membro:** Gente em Ação, Negócios, Indicações, Convites, Perfil
- **Admin:** Dashboard, Pessoas, Admin, Ranking
- **Facilitador:** Admin, Pessoas, Encontros, Estatísticas

Layout principal usa `pb-20` no mobile e `safe-area-inset-bottom` para compatibilidade com iPhones.

---

## Integrações

### RD Station

- Script de rastreamento via loader no `index.html`
- **Apenas o formulário de cadastro (signup)** em `Auth.tsx` é capturado
- Todos os demais formulários utilizam `data-rd-no-capture="true"`

---

## PWA

- Instalável em mobile e desktop
- Modo offline com cache de dados
- Push notifications (locais)
- Splash screens para iOS
- Ícones em múltiplos tamanhos

---

## Changelog

### v3.0.0 (2026-03-12)

**Bloco 1 — Privacidade e Convites:**
- Privacidade RD Station (apenas signup capturado)
- Sistema de convites com email automático e expiração 30 dias
- Indicações com status (frio/morno/quente) e cores visuais

**Bloco 2 — Papéis e Gestão:**
- Papéis Admin/Facilitador com RLS CRUD total
- Gestão de Registros unificada (/admin/registros)
- Gestão de Pessoas (/admin/pessoas) com abas Membros/Convidados/Inativos

**Bloco 3 — Mobile UX:**
- BottomNav com atalhos por role
- Layout responsivo com safe-area-inset-bottom

**Bloco 4 — Feed e Dashboard:**
- Página /feed com filtros por tipo, período e grupo
- Coluna team_id na activity_feed para filtro direto
- KPIs no Dashboard Admin: % presença, métricas por grupo, volume financeiro anual
- Triggers atualizados para popular team_id automaticamente

**Bloco 5 — Membros, Convidados e Eventos:**
- Diretório de membros unificado com grupos (/membros)
- Facilitadores com destaque visual (cor e selo)
- Gestão de convidados por encontro
- Eventos ordenados por data com destaque "Em breve" (7 dias)

**Bloco 6 — Perfil v3 e Cases:**
- Novos campos: tags, what_i_do, ideal_client, how_to_refer_me
- Abas no perfil: Sobre, Atividades, Estatísticas, Cases
- Gerador de Pitch via IA
- Cases de negócio com slider de cards e pontuação (15pts autor, 20pts indicador)

**Bloco 7 — Conselho 24/7 e Estatísticas:**
- Conselho 24/7 em formato Kanban (Aberto, Em Andamento, Resolvido)
- Pontuação: 5pts por resposta, +5pts melhor resposta
- Triggers: handle_council_reply_insert, handle_best_answer_update

**Bloco 8 — Performance e Segurança (Cloudflare):**
- Cloudflare Turnstile no cadastro de convidados (anti-bot)
- Edge Function verify-turnstile para validação server-side
- Cloudflare Web Analytics para monitoramento de Core Web Vitals
- Cloudflare Worker Proxy para cache de borda (api.gentenetworking.com.br)

### v3.1.0 (2026-03-13)

**Triggers de Gamificação e Correções:**
- 16 triggers automáticos para pontuação mensal (Gente em Ação, Depoimentos, Indicações, Negócios, Presenças, Conselho 24/7, Cases, Convites)
- Componente AdminCacheDiagnostics para monitoramento de cache HIT/MISS/BYPASS
- Correção do supabaseReadOnly que não compartilhava sessão de autenticação (RLS)
- Unificação das páginas /membros e /grupos em abas
- ScoringRulesCard atualizado com todas as 8 atividades
- Links de notificações (sininho) agora direcionam para /feed
- Melhorias de responsividade mobile (overflow-x-hidden, grids adaptativos, filtros empilhados)
- Documentação /documentacao atualizada com seção de Arquitetura de Performance

### v2.3.0 (2026-02-08)
- Sistema de pontuação mensal por grupo
- Rankings mensais com filtros
- Gestão de Pessoas unificada
- Funções deactivate_member/reactivate_member

### v2.0.0
- Sistema de privacidade por grupo
- Funções get_user_teams, are_same_team

### v1.0.0
- Lançamento inicial

---

## Contato

Para dúvidas técnicas, consulte `/documentacao` ou entre em contato com a equipe de desenvolvimento.
