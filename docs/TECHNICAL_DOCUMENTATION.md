# Documentação Técnica - Gente Networking

> **Última atualização:** 2026-03-12
> **Versão:** 3.0.0

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

---

## Visão Geral

O **Gente Networking** é uma plataforma de gestão de comunidade de networking profissional. O sistema permite:

- Gerenciamento de grupos e membros com 4 perfis de usuário (Admin, Facilitador, Membro, Convidado)
- Registro de atividades de networking (Gente em Ação, Depoimentos, Indicações, Negócios)
- Sistema de gamificação com pontos mensais por grupo e ranks
- Calendário de encontros quinzenais
- Convites personalizados com email automático
- Dashboard de estatísticas com KPIs por grupo
- Feed de atividades com filtros avançados
- Notificações por email (Resend) e push (local)
- **Sistema de privacidade por grupo**: Membros só visualizam informações de outros membros do mesmo grupo
- Navegação mobile otimizada com BottomNav por role

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
│   └── send-notification/ # Notificações (depoimentos, indicações, convites, etc.)
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
| `/convite/:code/cadastrar` | `CadastroConvidado.tsx` | Cadastro via convite |
| `/instalar` | `Instalar.tsx` | Instruções de instalação PWA |

### Autenticadas

| Rota | Arquivo | Descrição | Acesso |
|------|---------|-----------|--------|
| `/` | `Index.tsx` | Dashboard com feed de atividades | Todos |
| `/feed` | `Feed.tsx` | Feed completo com filtros (tipo, período, grupo) | Membros+ |
| `/perfil` | `Profile.tsx` | Perfil com histórico de pontos | Todos |
| `/membros` | `Membros.tsx` | Diretório de membros com filtros e exportação | Membros+ |
| `/membro/:slug` | `MemberProfile.tsx` | Perfil individual com URL amigável | Membros+ |
| `/aniversarios` | `Aniversarios.tsx` | Calendário de aniversários | Membros+ |
| `/ranking` | `Ranking.tsx` | Ranking mensal por grupo | Membros+ |
| `/gente-em-acao` | `GenteEmAcao.tsx` | Reuniões 1-a-1 | Membros+ |
| `/depoimentos` | `Depoimentos.tsx` | Envio de depoimentos | Membros+ |
| `/indicacoes` | `Indicacoes.tsx` | Indicações de contatos | Membros+ |
| `/negocios` | `Negocios.tsx` | Registro de negócios | Membros+ |
| `/encontros` | `Encontros.tsx` | Calendário de encontros | Membros+ |
| `/convites` | `Convites.tsx` | Gerenciamento de convites | Membros+ |
| `/equipes` | `Equipes.tsx` | Gestão de grupos | Admin/Facilitador |
| `/estatisticas` | `Estatisticas.tsx` | Gráficos e métricas | Membros+ |
| `/conteudos` | `Conteudos.tsx` | Materiais educativos | Membros+ |
| `/changelog` | `Changelog.tsx` | Histórico de versões | Membros+ |
| `/documentacao` | `Documentacao.tsx` | Documentação do sistema | Membros+ |
| `/configuracoes` | `Configuracoes.tsx` | Configurações e preferências de notificação | Todos |

### Administrativas

| Rota | Arquivo | Descrição | Acesso |
|------|---------|-----------|--------|
| `/dashboard` | `AdminDashboard.tsx` | Dashboard com KPIs, gráficos e métricas | Admin |
| `/admin` | `Admin.tsx` | Painel administrativo | Admin/Facilitador |
| `/admin/pessoas` | `GestaoPessoas.tsx` | Gestão unificada de Membros/Convidados/Inativos | Admin/Facilitador |
| `/admin/registros` | `AdminRegistros.tsx` | Gestão CRUD de registros (todas as tabelas) | Admin |

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
| `ScoringRulesCard` | Regras de pontuação |
| `AdminDataView` | Visualização de dados administrativos |
| `NotificationSettings` | Configurações de notificação por tipo |
| `PasswordStrengthIndicator` | Indicador visual de força da senha |
| `OfflineIndicator` | Indicador de modo offline |
| `PWAInstallPrompt` | Prompt de instalação PWA |

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
| `useReferrals` | Indicações |
| `useBusinessDeals` | Negócios |
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

### Fluxo de Cadastro

1. Usuário preenche: Nome, Email, WhatsApp, Empresa, Segmento, Senha
2. Validação frontend com Zod
3. Verificação de email duplicado via `profiles`
4. `signUp()` cria usuário com metadata
5. Trigger `handle_new_user()` cria perfil
6. Se convite, `accept_invitation()` é chamado

### Roles

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total. Dashboard, gestão global, CRUD de registros |
| `facilitador` | Gerencia seu grupo. Promove convidados, gerencia presenças |
| `membro` | Participa de atividades. Registra eventos, cria convites |
| `convidado` | Acesso limitado. Aguarda promoção após primeiro encontro |

---

## Sistema de Pontuação Mensal

### Regras

| Atividade | Pontos | Contexto de Grupo |
|-----------|--------|-------------------|
| Gente em Ação | 25 pts | Grupo em comum com parceiro |
| Presença em Encontro | 20 pts | Grupo do encontro |
| Indicação | 20 pts | Grupo em comum com destinatário |
| Depoimento | 15 pts | Grupo em comum com destinatário |
| Convite Aceito (com presença) | 15 pts | Grupos do convidador |
| Negócio | 5 pts / R$ 100 | Todos os grupos do usuário |

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
| `calculate_monthly_points_for_team()` | Calcula pontos por grupo/mês |
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
| `profiles` | Perfis (nome, empresa, pontos, rank, slug, preferências de notificação) |
| `user_roles` | Roles (admin, facilitador, membro, convidado) |
| `teams` | Grupos de networking |
| `team_members` | Membros dos grupos (is_facilitator) |
| `meetings` | Encontros (título, data, horário, local, team_id) |
| `attendances` | Presenças em encontros |
| `gente_em_acao` | Reuniões 1-a-1 (partner_id, guest_name, meeting_type) |
| `testimonials` | Depoimentos |
| `referrals` | Indicações (status: morno/quente/frio) |
| `business_deals` | Negócios (valor, referred_by) |
| `activity_feed` | Feed de atividades (com team_id para filtro por grupo) |
| `monthly_points` | Pontuação mensal por grupo |
| `points_history` | Histórico de pontos (team_id, year_month) |
| `contents` | Conteúdos educativos |
| `invitations` | Convites (code, status, expires_at, metadata) |
| `system_changelog` | Changelog do sistema |

### Funções de Privacidade

| Função | Descrição |
|--------|-----------|
| `get_user_teams(user_id)` | Times do usuário |
| `are_same_team(user_id1, user_id2)` | Verifica mesmo time |
| `has_role(user_id, role)` | Verifica role |
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

---

## Feed de Atividades

### Página `/feed` (v3.0.0)

Feed completo com:
- **Filtro por tipo:** Gente em Ação, Depoimento, Negócio, Indicação, Presença, Convite, Convidado presente
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
- Privacidade RD Station
- Sistema de convites com email automático
- Indicações com status (morno/quente/frio)

**Bloco 2 — Papéis e Gestão:**
- Papéis Admin/Facilitador com RLS CRUD
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
