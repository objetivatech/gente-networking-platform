# Fluxos de Usuário - Gente Networking

> **Última atualização:** 2026-03-12
> **Versão:** 3.0.0

Este documento descreve todos os fluxos de ação dentro do sistema, incluindo gestão de usuários, atividades de networking, sistema de pontuação mensal por grupo, feed de atividades, dashboard administrativo, Conselho 24/7 e Cases de Negócio.

---

## Índice

1. [Ciclo de Vida do Usuário](#ciclo-de-vida-do-usuário)
2. [Fluxos de Atividades](#fluxos-de-atividades)
3. [Conselho 24/7](#conselho-247)
4. [Cases de Negócio](#cases-de-negócio)
5. [Sistema de Pontuação](#sistema-de-pontuação)
6. [Feed de Atividades](#feed-de-atividades)
7. [Dashboard Administrativo](#dashboard-administrativo)
8. [Navegação Mobile](#navegação-mobile)
9. [Segurança (Cloudflare Turnstile)](#segurança-cloudflare-turnstile)
10. [Validações e Triggers](#validações-e-triggers)

---

## Ciclo de Vida do Usuário

### 1. Fluxo de Convite e Cadastro

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE CONVITE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Membro Existente]                                                          │
│        │                                                                     │
│        ▼                                                                     │
│  ┌─────────────┐     ┌───────────────┐     ┌────────────────┐               │
│  │ /convites   │────▶│ Gerar Link    │────▶│ Link Copiado   │               │
│  │ Criar novo  │     │ código único  │     │ validade 30d   │               │
│  └─────────────┘     └───────────────┘     └────────────────┘               │
│                                                   │                          │
│                                                   ▼                          │
│                                        ┌────────────────┐                    │
│                                        │ Convidado      │                    │
│                                        │ acessa link    │                    │
│                                        └────────────────┘                    │
│                                                   │                          │
│                            ┌──────────────────────┼──────────────────────┐   │
│                            ▼                      ▼                      ▼   │
│                    ┌───────────────┐     ┌───────────────┐     ┌────────────┤
│                    │ Link expirado │     │ Link válido   │     │ Link já    │
│                    │ erro 404      │     │ cadastro      │     │ usado      │
│                    └───────────────┘     └───────────────┘     └────────────┤
│                                                   │                          │
│                                                   ▼                          │
│                                        ┌────────────────┐                    │
│                                        │ Formulário     │                    │
│                                        │ Nome, Email,   │                    │
│                                        │ WhatsApp,      │                    │
│                                        │ Empresa,       │                    │
│                                        │ Segmento,      │                    │
│                                        │ Senha          │                    │
│                                        ├────────────────┤                    │
│                                        │ ⚡ Turnstile   │                    │
│                                        │ (anti-bot)     │                    │
│                                        └────────────────┘                    │
│                                                   │                          │
│                                                   ▼                          │
│                                        ┌────────────────┐                    │
│                                        │ Verificações:  │                    │
│                                        │ 1. Turnstile   │                    │
│                                        │    server-side │                    │
│                                        │ 2. Criar user  │                    │
│                                        │ 3. Criar profile│                   │
│                                        │ 4. Accept invite│                   │
│                                        │ 5. Role=convidado│                  │
│                                        │ 6. Email convite│                   │
│                                        └────────────────┘                    │
│                                                   │                          │
│                                                   ▼                          │
│                                        ┌────────────────┐                    │
│                                        │ Status: CONVIDADO│                  │
│                                        │ Aguarda promoção│                   │
│                                        └────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tabelas:** `invitations`, `auth.users`, `profiles`, `user_roles`  
**Triggers:** `handle_new_user()`, `accept_invitation()`  
**Edge Functions:** `verify-turnstile` (anti-bot), `send-notification` (tipo: invitation)

---

### 2. Fluxo de Promoção (Convidado → Membro/Facilitador)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE PROMOÇÃO                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Admin ou Facilitador]                                                      │
│        │                                                                     │
│        ▼                                                                     │
│  /admin/pessoas → Tab: Convidados → Botão "Promover"                        │
│        │                                                                     │
│        ▼                                                                     │
│  Modal: Selecionar role + Grupo                                             │
│    - Admin: pode escolher Membro ou Facilitador, grupo opcional             │
│    - Facilitador: apenas Membro, grupo pré-selecionado (seu grupo)          │
│        │                                                                     │
│        ▼                                                                     │
│  RPC: promote_guest_to_member (SECURITY DEFINER)                            │
│    - Valida permissões do chamador                                           │
│    - Upsert em user_roles (remove 'convidado', insere novo role)            │
│    - Adiciona a team_members se grupo informado                              │
│        │                                                                     │
│        ▼                                                                     │
│  Status: MEMBRO ou FACILITADOR                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Fluxo de Desativação

```
/admin/pessoas → Tab: Membros → Botão "Desativar" → Modal (motivo)
    → Função: deactivate_member() (SECURITY DEFINER)
    → 1. Remove de TODOS os grupos
    → 2. is_active = false, deactivated_at, deactivation_reason
    → Status: INATIVO
```

### 4. Fluxo de Reativação

```
/admin/pessoas → Tab: Inativos → Botão "Reativar"
    → Função: reactivate_member() (SECURITY DEFINER)
    → is_active = true, limpa campos de desativação
    → Status: ATIVO (sem grupo, admin deve adicionar manualmente)
```

---

## Fluxos de Atividades

### Gente em Ação (Reuniões 1-a-1)

```
/gente-em-acao → Novo registro
    → Tipo (1-a-1, Online, Presencial)
    → Data, Parceiro (membro OU convidado externo), Observações, Foto
    → INSERT gente_em_acao
    → Trigger: handle_gente_em_acao_insert()
        1. Adiciona ao activity_feed (com team_id = grupo em comum)
        2. +25 pontos mensais por grupo
```

### Depoimentos

```
/depoimentos → Novo depoimento
    → Selecionar membro do grupo + Conteúdo
    → INSERT testimonials
    → Trigger: handle_testimonial_insert()
        1. Adiciona ao activity_feed (com team_id = grupo em comum)
        2. +15 pontos para quem ENVIA
    → Edge Function: send-notification (email para destinatário)
```

### Indicações

```
/indicacoes → Nova indicação
    → Membro destinatário + Nome/Telefone/Email do contato
    → Status: Frio 🔵 / Morno 🟡 / Quente 🔴
    → Observações
    → INSERT referrals (status: morno por padrão)
    → Trigger: handle_referral_insert()
        1. Adiciona ao activity_feed (com team_id = grupo em comum)
        2. +20 pontos para quem INDICA
    → Edge Function: send-notification (email para destinatário)
```

### Negócios Realizados

```
/negocios → Novo negócio
    → Cliente, Valor (R$), Data, Indicação de quem? (opcional), Descrição
    → INSERT business_deals
    → Trigger: handle_business_deal_insert()
        1. Adiciona ao activity_feed (com team_id = grupo do usuário)
        2. +5 pontos por R$100
```

### Presenças em Encontros

```
/encontros → Confirmar presença
    → INSERT attendances
    → Trigger: handle_attendance_insert()
        1. Adiciona ao activity_feed (com team_id = grupo do encontro)
        2. +20 pontos
    → Se convidado: handle_guest_attendance_insert()
        → +15 pontos para o convidador
```

---

## Conselho 24/7

### Fluxo de Criação de Tópico

```
/conselho → Novo Tópico
    → Título + Descrição + Grupo (opcional)
    → INSERT council_posts (status: 'aberto')
    → Atividade registrada no feed
    → Autor NÃO pontua
```

### Fluxo de Resposta

```
/conselho → Abrir tópico → Responder
    → INSERT council_replies
    → Trigger: handle_council_reply_insert()
        1. Adiciona ao activity_feed
        2. +5 pontos para quem responde
```

### Fluxo de Melhor Resposta

```
/conselho → Abrir tópico → Marcar melhor resposta (apenas autor do tópico)
    → UPDATE council_replies (is_best_answer = true)
    → Trigger: handle_best_answer_update()
        → +5 pontos adicionais para quem respondeu
```

### Status Kanban

```
Aberto → Em Andamento → Resolvido
(autor pode alterar o status do seu tópico)
```

---

## Cases de Negócio

### Fluxo de Registro

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE CASE DE NEGÓCIO                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Membro]                                                                    │
│        │                                                                     │
│        ▼                                                                     │
│  1. Registrar negócio em /negocios (pré-requisito)                          │
│        │                                                                     │
│        ▼                                                                     │
│  2. Acessar perfil → Aba "Cases" → "Novo Case"                             │
│        │                                                                     │
│        ▼                                                                     │
│  3. Preencher: Título, Descrição, Resultado, Cliente                        │
│     Vincular ao negócio fechado                                              │
│     Adicionar imagem (opcional)                                              │
│        │                                                                     │
│        ▼                                                                     │
│  4. INSERT business_cases                                                    │
│        │                                                                     │
│        ▼                                                                     │
│  5. Pontuação:                                                               │
│     +15 pts → Autor do case                                                  │
│     +20 pts → Membro que indicou o negócio original                         │
│        │                                                                     │
│        ▼                                                                     │
│  6. Aparece no feed de atividades                                            │
│     Aparece como slider de cards no perfil do membro                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tabelas:** `business_cases`, `business_deals`  
**Exibição:** Slider de cards no perfil (máx 3 visíveis, rotação automática)

---

## Sistema de Pontuação

### Modelo Mensal por Grupo (v2.3.0+)

- Pontos são calculados **mensalmente** e por **grupo**
- A cada novo mês, ranking reinicia
- Tabela `monthly_points`: (user_id, team_id, year_month, points, rank)
- Triggers recalculam automaticamente após cada atividade
- **Admin e Facilitador não pontuam** (retorno 0 na função de cálculo)

### Tabela Completa de Pontuação

| Atividade | Pontos | Contexto de Grupo |
|-----------|--------|-------------------|
| Gente em Ação | 25 pts | Grupo em comum com parceiro |
| Presença em Encontro | 20 pts | Grupo do encontro |
| Indicação | 20 pts | Grupo em comum com destinatário |
| Case de Negócio (indicador) | 20 pts | Grupos do indicador |
| Depoimento | 15 pts | Grupo em comum com destinatário |
| Convite Aceito (com presença) | 15 pts | Grupos do convidador |
| Case de Negócio (autor) | 15 pts | Grupos do autor |
| Negócio | 5 pts / R$100 | Todos os grupos do usuário |
| Resposta no Conselho | 5 pts | Grupo do tópico |
| Melhor Resposta (Conselho) | +5 pts | Grupo do tópico |

### Contexto de Grupo das Atividades

| Atividade | Lógica de Grupo |
|-----------|----------------|
| Presença | Grupo do encontro (meetings.team_id) |
| Gente em Ação | Grupo em comum com parceiro, ou primeiro grupo do usuário |
| Depoimentos | Grupo em comum entre remetente e destinatário |
| Indicações | Grupo em comum entre remetente e destinatário |
| Negócios | Primeiro grupo do usuário |
| Convites | Grupo do convidador |
| Conselho | team_id do tópico, ou global |
| Cases | Grupos do autor |

---

## Feed de Atividades

### Página /feed (v3.0.0)

```
/feed → Filtros: Tipo + Período + Grupo
    → Tipo: Gente em Ação, Depoimento, Negócio, Indicação, Presença,
            Convite, Convidado presente, Conselho
    → Período: Este mês, Mês passado, 3 meses, 6 meses, Todo período
    → Grupo: Filtra diretamente pela coluna team_id na activity_feed
    → Clique no item → Dialog com detalhes completos (metadata, data)
```

### Coluna team_id na activity_feed

Cada atividade registrada pelos triggers recebe automaticamente o `team_id` do grupo relevante, permitindo filtro direto sem necessidade de join com `team_members`.

---

## Dashboard Administrativo

### Página /dashboard (v3.0.0)

```
/dashboard (Admin/Facilitador)
    │
    ├── Stats Cards: Membros ativos, Negócios (acumulado + anual),
    │   Gente em Ação, Interações, Convites aceitos
    │
    ├── Gráfico: Atividades por mês (últimos 6 meses)
    ├── Gráfico: Distribuição por rank (pizza)
    │
    ├── % Presença por Encontro (barras visuais)
    ├── KPIs por Grupo (tabela: membros, GA, indicações, depoimentos, R$)
    │
    ├── Métricas de Convites por Membro (enviados, aceitos, nos encontros)
    ├── Top 10 Membros
    └── Atividades Recentes (realtime)
```

---

## Navegação Mobile

### BottomNav (v3.0.0)

Visível apenas em telas < 768px (`lg:hidden`).

| Role | Atalhos |
|------|---------|
| Membro | Gente em Ação, Negócios, Indicações, Convites, Perfil |
| Admin | Dashboard, Pessoas, Admin, Ranking |
| Facilitador | Admin, Pessoas, Encontros, Estatísticas |

Layout com `pb-20` e `safe-area-inset-bottom` para compatibilidade mobile.

---

## Segurança (Cloudflare Turnstile)

### Fluxo de Verificação Anti-Bot

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE TURNSTILE - ANTI-BOT                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Convidado no formulário de cadastro]                                       │
│        │                                                                     │
│        ▼                                                                     │
│  1. Widget Turnstile carrega automaticamente                                │
│        │                                                                     │
│        ▼                                                                     │
│  2. Usuário resolve desafio (invisível ou interativo)                       │
│        │                                                                     │
│        ▼                                                                     │
│  3. Token gerado → botão "Criar Conta" habilitado                          │
│        │                                                                     │
│        ▼                                                                     │
│  4. Ao submeter → supabase.functions.invoke('verify-turnstile', { token })  │
│        │                                                                     │
│        ▼                                                                     │
│  5. Edge Function valida token contra API Cloudflare (siteverify)           │
│        │                                                                     │
│        ├── Sucesso → Prossegue com criação da conta                         │
│        └── Falha → Erro "Verificação de segurança falhou"                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Componente:** `CloudflareTurnstile.tsx`  
**Edge Function:** `verify-turnstile` (`verify_jwt = false`)  
**Secret:** `TURNSTILE_SECRET_KEY`

---

## Validações e Triggers

### Triggers de Inserção

| Trigger | Tabela | Ações |
|---------|--------|-------|
| `handle_new_user()` | auth.users | Cria perfil automaticamente |
| `handle_gente_em_acao_insert()` | gente_em_acao | Feed + pontos + team_id |
| `handle_testimonial_insert()` | testimonials | Feed + pontos + team_id |
| `handle_referral_insert()` | referrals | Feed + pontos + team_id |
| `handle_business_deal_insert()` | business_deals | Feed + pontos + team_id |
| `handle_attendance_insert()` | attendances | Feed + pontos + team_id |
| `handle_guest_attendance_insert()` | attendances | Pontos para convidador + team_id |
| `handle_invitation_accepted()` | invitations | Feed + pontos do convidador |
| `handle_profile_slug()` | profiles | Gera slug único |
| `handle_council_reply_insert()` | council_replies | Feed + pontos para respondente |
| `handle_best_answer_update()` | council_replies | +5 pontos para melhor resposta |

### Triggers de Deleção

| Trigger | Tabela | Ação |
|---------|--------|------|
| `handle_testimonial_delete()` | testimonials | Recalcula pontos |
| `handle_referral_delete()` | referrals | Recalcula pontos |
| `handle_business_deal_delete()` | business_deals | Recalcula pontos |
| `handle_gente_em_acao_delete()` | gente_em_acao | Recalcula pontos |
| `handle_attendance_delete()` | attendances | Recalcula pontos (usuário + convidador) |

### Notificações por Email

| Evento | Destinatário | Template |
|--------|-------------|----------|
| Novo depoimento | Membro que recebeu | testimonialEmailTemplate |
| Nova indicação | Membro que recebeu | referralEmailTemplate |
| Convite enviado | Email do convidado | invitationEmailTemplate |
| Convite aceito | Membro que convidou | invitationAcceptedEmailTemplate |
| Convidado no encontro | Membro que convidou | guestAttendedEmailTemplate |
| Boas-vindas | Novo membro | welcomeEmailTemplate |

**Preferências:** Cada usuário pode desabilitar notificações em `/configuracoes`:
- `email_notifications_enabled` — master toggle
- `notify_on_testimonial` — depoimentos
- `notify_on_referral` — indicações
- `notify_on_meeting` — encontros
