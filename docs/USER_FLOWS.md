# Fluxos de Usuário - Gente Networking

> **Última atualização:** 2026-03-12
> **Versão:** 3.0.0

Este documento descreve todos os fluxos de ação dentro do sistema, incluindo gestão de usuários, atividades de networking, sistema de pontuação mensal por grupo, feed de atividades e dashboard administrativo.

---

## Índice

1. [Ciclo de Vida do Usuário](#ciclo-de-vida-do-usuário)
2. [Fluxos de Atividades](#fluxos-de-atividades)
3. [Sistema de Pontuação](#sistema-de-pontuação)
4. [Feed de Atividades](#feed-de-atividades)
5. [Dashboard Administrativo](#dashboard-administrativo)
6. [Navegação Mobile](#navegação-mobile)
7. [Validações e Triggers](#validações-e-triggers)

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
│                                        └────────────────┘                    │
│                                                   │                          │
│                                                   ▼                          │
│                                        ┌────────────────┐                    │
│                                        │ Triggers:      │                    │
│                                        │ 1. Criar user  │                    │
│                                        │ 2. Criar profile│                   │
│                                        │ 3. Accept invite│                   │
│                                        │ 4. Role=convidado│                  │
│                                        │ 5. Email convite│                   │
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
**Edge Function:** `send-notification` (tipo: invitation)

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
│  Modal: Selecionar role (Membro/Facilitador) + Grupo (opcional)             │
│        │                                                                     │
│        ▼                                                                     │
│  usePromoteGuest: Atualizar user_roles + Adicionar a team_members           │
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
    → Membro destinatário + Nome/Telefone/Email do contato + Observações
    → INSERT referrals (status: morno)
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

## Sistema de Pontuação

### Modelo Mensal por Grupo (v2.3.0+)

- Pontos são calculados **mensalmente** e por **grupo**
- A cada novo mês, ranking reinicia
- Tabela `monthly_points`: (user_id, team_id, year_month, points, rank)
- Triggers recalculam automaticamente após cada atividade

### Contexto de Grupo das Atividades

| Atividade | Lógica de Grupo |
|-----------|----------------|
| Presença | Grupo do encontro (meetings.team_id) |
| Gente em Ação | Grupo em comum com parceiro, ou primeiro grupo do usuário |
| Depoimentos | Grupo em comum entre remetente e destinatário |
| Indicações | Grupo em comum entre remetente e destinatário |
| Negócios | Primeiro grupo do usuário |
| Convites | Grupo do convidador |

---

## Feed de Atividades

### Página /feed (v3.0.0)

```
/feed → Filtros: Tipo + Período + Grupo
    → Tipo: Gente em Ação, Depoimento, Negócio, Indicação, Presença, Convite
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
