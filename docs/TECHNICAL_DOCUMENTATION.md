# Documentação Técnica - Gente Networking

> **Última atualização:** 2024-12-08  
> **Versão:** 1.0.0

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

---

## Visão Geral

O **Gente Networking** é uma plataforma de gestão de comunidade de networking profissional. O sistema permite:

- Gerenciamento de equipes e membros
- Registro de atividades de networking (Gente em Ação, Depoimentos, Indicações, Negócios)
- Sistema de gamificação com pontos e ranks
- Calendário de encontros quinzenais
- Convites personalizados
- Dashboard de estatísticas

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
| Supabase | Backend (Auth, Database, Edge Functions) |
| Resend | Envio de emails |
| RD Station | Marketing automation |

---

## Estrutura do Projeto

```
src/
├── assets/              # Imagens e recursos estáticos
├── components/          # Componentes React
│   ├── layout/          # Componentes de layout (Header, Sidebar, MainLayout)
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
│   ├── rdstation/       # Integração RD Station
│   ├── send-email/      # Envio de emails
│   └── send-notification/ # Notificações
└── migrations/          # Migrações SQL

docs/
├── CLOUDFLARE_PAGES_DEPLOY.md
├── PWA_IMPLEMENTATION.md
└── TECHNICAL_DOCUMENTATION.md (este arquivo)
```

---

## Rotas e Páginas

### Públicas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/auth` | `Auth.tsx` | Login, cadastro e recuperação de senha |
| `/convite/:code` | `ConvitePublico.tsx` | Página pública de convite |
| `/instalar` | `Instalar.tsx` | Instruções de instalação PWA |

### Autenticadas

| Rota | Arquivo | Descrição | Acesso |
|------|---------|-----------|--------|
| `/` | `Index.tsx` | Dashboard com feed de atividades | Todos |
| `/perfil` | `Profile.tsx` | Perfil com histórico de pontos | Todos |
| `/ranking` | `Ranking.tsx` | Ranking de membros | Membros+ |
| `/gente-em-acao` | `GenteEmAcao.tsx` | Reuniões 1-a-1 | Membros+ |
| `/depoimentos` | `Depoimentos.tsx` | Envio de depoimentos | Membros+ |
| `/indicacoes` | `Indicacoes.tsx` | Indicações de contatos | Membros+ |
| `/negocios` | `Negocios.tsx` | Registro de negócios | Membros+ |
| `/encontros` | `Encontros.tsx` | Calendário de encontros | Membros+ |
| `/convites` | `Convites.tsx` | Gerenciamento de convites | Membros+ |
| `/equipes` | `Equipes.tsx` | Gestão de equipes | Admin/Facilitador |
| `/estatisticas` | `Estatisticas.tsx` | Gráficos e métricas | Membros+ |
| `/conteudos` | `Conteudos.tsx` | Materiais educativos | Membros+ |
| `/admin` | `Admin.tsx` | Painel administrativo | Admin |
| `/admin/dashboard` | `AdminDashboard.tsx` | Dashboard admin | Admin |
| `/configuracoes` | `Configuracoes.tsx` | Configurações | Todos |
| `/documentacao` | `Documentacao.tsx` | Documentação do sistema | Membros+ |

---

## Componentes

### Layout

| Componente | Descrição |
|------------|-----------|
| `MainLayout` | Layout principal com sidebar e header |
| `Header` | Cabeçalho com navegação e perfil |
| `Sidebar` | Menu lateral com navegação |
| `NavLink` | Link de navegação estilizado |

### Funcionalidades

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `PasswordStrengthIndicator` | `PasswordStrengthIndicator.tsx` | Indicador visual de força da senha |
| `PointsEvolutionChart` | `PointsEvolutionChart.tsx` | Gráfico de evolução de pontos |
| `PointsHistoryCard` | `PointsHistoryCard.tsx` | Card com histórico de pontos |
| `RankBadge` | `RankBadge.tsx` | Badge visual do rank |
| `ActivityFeed` | `ActivityFeed.tsx` | Feed de atividades em tempo real |
| `MemberSelect` | `MemberSelect.tsx` | Seletor de membros |
| `ScoringRulesCard` | `ScoringRulesCard.tsx` | Regras de pontuação |
| `OfflineIndicator` | `OfflineIndicator.tsx` | Indicador de modo offline |
| `PWAInstallPrompt` | `PWAInstallPrompt.tsx` | Prompt de instalação PWA |
| `NotificationSettings` | `NotificationSettings.tsx` | Configurações de notificação |

---

## Hooks Customizados

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useAuth` | `AuthContext.tsx` | Autenticação (login, signup, logout, resetPassword) |
| `useAdmin` | `useAdmin.ts` | Verificação de roles (isAdmin, isFacilitator, etc) |
| `useProfile` | `useProfile.ts` | Dados do perfil do usuário |
| `useMembers` | `useMembers.ts` | Lista de membros |
| `useTeams` | `useTeams.ts` | Gestão de equipes |
| `useMeetings` | `useMeetings.ts` | Encontros e presenças |
| `useGenteEmAcao` | `useGenteEmAcao.ts` | Reuniões 1-a-1 |
| `useTestimonials` | `useTestimonials.ts` | Depoimentos |
| `useReferrals` | `useReferrals.ts` | Indicações |
| `useBusinessDeals` | `useBusinessDeals.ts` | Negócios |
| `useInvitations` | `useInvitations.ts` | Convites |
| `useRanking` | `useRanking.ts` | Ranking de membros |
| `useStats` | `useStats.ts` | Estatísticas gerais |
| `usePointsHistory` | `usePointsHistory.ts` | Histórico de pontos |
| `useActivityFeed` | `useActivityFeed.ts` | Feed de atividades |
| `useContents` | `useContents.ts` | Conteúdos educativos |
| `useOfflineData` | `useOfflineData.ts` | Cache offline |
| `usePWAInstall` | `usePWAInstall.ts` | Instalação PWA |
| `usePushNotifications` | `usePushNotifications.ts` | Notificações push |
| `useRDStation` | `useRDStation.ts` | Integração RD Station |

---

## Autenticação

### Fluxo de Login

1. Usuário acessa `/auth`
2. Insere email e senha
3. `signIn()` do AuthContext chama `supabase.auth.signInWithPassword()`
4. Sucesso: redirect para `/`
5. Erro: exibe toast com mensagem

### Fluxo de Cadastro

1. Usuário preenche formulário com:
   - Nome Completo (obrigatório)
   - Email (obrigatório, validado, verificado duplicidade)
   - WhatsApp (obrigatório, máscara brasileira)
   - Nome da Empresa (obrigatório)
   - Segmento de Negócio (obrigatório)
   - Senha (obrigatório, indicador de força)
   - Confirmação de Senha (obrigatório)
2. Validação frontend com Zod
3. Verificação de email duplicado via `profiles` table
4. `signUp()` cria usuário com metadata
5. Trigger `handle_new_user()` cria perfil automaticamente
6. Se há código de convite, `accept_invitation()` é chamado
7. Email de confirmação é enviado

### Recuperação de Senha

1. Usuário clica em "Esqueci minha senha" na tela de login
2. Insere email no modal
3. `resetPassword()` chama `supabase.auth.resetPasswordForEmail()`
4. Email com link de recuperação é enviado
5. Usuário clica no link e redefine a senha

### Roles

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total ao sistema |
| `facilitador` | Gerencia sua equipe |
| `membro` | Participa de atividades |
| `convidado` | Acesso limitado, aguarda promoção |

---

## Sistema de Pontuação

### Regras de Pontuação

| Atividade | Pontos |
|-----------|--------|
| Gente em Ação (reunião 1-a-1) | 25 pts |
| Presença em Encontro | 20 pts |
| Indicação de Contato | 20 pts |
| Depoimento | 15 pts |
| Convite Aceito | 15 pts |
| Negócio Realizado | 5 pts / R$ 100 |

### Ranks

| Rank | Pontos | Emoji |
|------|--------|-------|
| Iniciante | 0-49 | 🌱 |
| Bronze | 50-199 | 🥉 |
| Prata | 200-499 | 🥈 |
| Ouro | 500-999 | 🥇 |
| Diamante | 1000+ | 💎 |

### Triggers Automáticos

Os pontos são calculados automaticamente via triggers PostgreSQL:
- `update_user_points_and_rank()` atualiza pontos após cada atividade
- Histórico salvo em `points_history` para visualização de evolução

---

## Banco de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis de usuários (nome, empresa, pontos, rank) |
| `user_roles` | Roles dos usuários |
| `teams` | Equipes de networking |
| `team_members` | Membros das equipes |
| `meetings` | Encontros quinzenais |
| `attendances` | Presenças em encontros |
| `gente_em_acao` | Reuniões 1-a-1 |
| `testimonials` | Depoimentos |
| `referrals` | Indicações de contatos |
| `business_deals` | Negócios fechados |
| `activity_feed` | Feed de atividades |
| `contents` | Conteúdos educativos |
| `invitations` | Convites de membros |
| `points_history` | Histórico de pontos |

### Funções PostgreSQL

| Função | Descrição |
|--------|-----------|
| `has_role(_role, _user_id)` | Verifica se usuário tem role |
| `is_guest(_user_id)` | Verifica se é convidado |
| `is_team_facilitator(_team_id, _user_id)` | Verifica se é facilitador da equipe |
| `calculate_user_points(_user_id)` | Calcula pontos do usuário |
| `get_rank_from_points(_points)` | Retorna rank baseado em pontos |
| `update_user_points_and_rank(_user_id)` | Atualiza pontos e rank |
| `accept_invitation(_code, _user_id)` | Aceita convite |
| `add_activity_feed(...)` | Adiciona ao feed |

---

## Edge Functions

### send-email

Envio de emails genéricos via Resend.

**Endpoint:** `POST /send-email`

**Body:**
```json
{
  "to": "email@exemplo.com",
  "subject": "Assunto",
  "html": "<p>Conteúdo</p>"
}
```

### send-notification

Notificações de depoimentos e indicações.

**Endpoint:** `POST /send-notification`

**Body:**
```json
{
  "type": "testimonial" | "referral",
  "toUserId": "uuid",
  "fromUserId": "uuid",
  "content": "texto"
}
```

### rdstation

Integração com RD Station Marketing.

**Endpoint:** `POST /rdstation`

**Body:**
```json
{
  "action": "create_conversion",
  "data": {
    "conversion_identifier": "cadastro-gente-networking",
    "email": "email@exemplo.com",
    "name": "Nome",
    ...
  }
}
```

---

## Integrações

### RD Station

- Sincronização automática após cadastro
- Campo `rd_station_synced_at` controla última sincronização
- Conversões enviadas para tracking de leads

### Resend

- Envio de emails transacionais
- Templates centralizados em `_shared/email-templates.ts`
- Identidade visual consistente

---

## PWA

### Recursos

- Instalável em mobile e desktop
- Modo offline com cache de dados
- Push notifications
- Splash screens para iOS
- Ícones em múltiplos tamanhos

### Configuração

Arquivo `vite.config.ts` configura o `vite-plugin-pwa` com:
- Manifest
- Service Worker
- Estratégias de cache

Documentação completa em `docs/PWA_IMPLEMENTATION.md`.

---

## Changelog

### 2024-12-08
- Adicionado indicador de força de senha (`PasswordStrengthIndicator`)
- Adicionado recuperação de senha via email
- Adicionado máscara de telefone brasileiro
- Adicionado verificação de email duplicado no cadastro
- Adicionado campo de confirmação de senha
- Atualizada documentação técnica

---

## Contato

Para dúvidas técnicas, consulte a documentação do sistema em `/documentacao` ou entre em contato com a equipe de desenvolvimento.
