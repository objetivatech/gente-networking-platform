# Fluxos de Usuário - Gente Networking

> **Última atualização:** 2026-10-25
> **Versão:** 3.56.0 — Fluxo enxuto de convites e reconvite por papel

### Entrada e LPs unificadas

Visitante → `/auth` → apresentação editável → Entrar → login ou recuperação.
Não há cadastro aberto concorrente. Cadastro pelas LPs continua gerando CRM e convite
de ativação; `/convite/:code/cadastrar` e confirmação permanecem. Após login, o dashboard
atual continua em `/`. Admin → Landing Pages → editor de blocos/avançado e configurações.
O conteúdo antigo só aparece após exportação/importação; os domínios atuais ainda não
foram virados. Veja [UNIFICACAO_LPS.md](./UNIFICACAO_LPS.md).

Este documento descreve todos os fluxos de ação dentro do sistema, incluindo gestão de usuários, atividades de networking, sistema de pontuação mensal por grupo, feed de atividades, dashboard administrativo, Conselho 24/7 e Cases de Negócio.

---

## Planos e papéis (v3.55.0)

- `admin_assign_person_plan`: Admin ativo, perfil bloqueado na transação, plano ativo, conversão para Assinante explícita; mensalidade de público Assinante obrigatória. Reutiliza assinatura ativa do mesmo plano e rejeita outras assinaturas em aberto. Não registra pagamento fictício.
- Gestão de Pessoas: contadores e abas por Admin, Facilitador, Membro, Assinante, Convidado e Inativo. Total inclui pré-ativação deduplicada. Filtros aplicam-se aos dois; assinante não conta como membro.
- Reativação com plano cancela apenas Resgate futuro, preserva histórico, envia aviso e solicita primeira cobrança pelo fluxo existente. Falhas não desfazem o acesso já salvo e são exibidas para revisão. Não há nova automação recorrente do provedor nesta rodada.
- `has_module_access` e `useEntitlements` controlam módulos. Planos antigos preservam acessos legados quando a chave não existe; ao editar, o Admin vê os valores efetivos e salva chaves explícitas. Sem plano ativo, Assinante perde módulos pagos, sem perder perfil e histórico.
- Vitrine: Admin por padrão; Membro/Facilitador via `can_access_community_showcase`. Conteúdo sempre Assinante/Convidado ativo. Detalhe e WhatsApp usam RPC restrita; agendar depende do plano.
- Assinante inicia em dashboard próprio com plano, saldo MatchMaking e atalhos liberados. `Gente em Ação` mostra agendamentos, sem check gamificado.
- Convite Premium na ficha usa `invite_subscriber_premium`, Admin ou Facilitador do Grupo. Assinante confirma/recusa sua própria visita no início; nenhuma presença, conta, promoção ou ponto automático.
- `community-notification`: autenticação validada, destinatário derivado de assinatura/participação/agendamento. Mensagens registradas no histórico de envio; reenvios já concluídos são ignorados.
- Página pública, sitemap, cases públicos e pitch exigem plano Premium e recurso liberado. Assinantes não recebem esses recursos, Conselho, ranking ou estatísticas de Membros.
- Validação autenticada real permanece pendente: Supabase externo sem sessão disponível neste ambiente. Não foram criadas pessoas ou assinaturas de teste no ambiente real.

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

### 0. Cadastro pelas LPs e pelo site (v3.48.0)

```text
Cadastro público → identidade por email ou telefone → CRM + convite pendente
→ email personalizado por origem → definição voluntária de senha e confirmação
→ papel Convidado → participação → promoção auditável para Membro
```

O cadastro público nunca cria acesso automaticamente. Repetições reutilizam a identidade
e o convite pendente. Os contextos Gente HUB, Impulso, Comunidade, Participe, Site e Outra
origem servem para comunicação e análise, sem criar novos papéis.

## Fluxo enxuto de convites (v3.56.0)

1. O link `/convite/:codigo` abre uma **página única**: foto e nome de quem convidou, Grupo,
   data/horário/local do próximo encontro e o formulário (nome, e-mail, WhatsApp, empresa,
   segmento, senha). O link antigo `/convite/:codigo/cadastrar` redireciona para ela.
2. "Confirmar minha vaga" chama a função `complete-guest-signup`, que cria a conta **já
   confirmada** (sem 2º e-mail), aceita o convite e confirma a presença no próximo encontro do
   Grupo (ou no evento Gente HUB do convite). O convidado entra logado na plataforma.
3. E-mail já cadastrado: a pessoa é orientada a entrar na conta existente; nada é sobrescrito.

### Reconvite por papel

| Papel | Quem pode reconvidar | Para quais encontros |
|---|---|---|
| Membro | Apenas os próprios convidados (`/convites`) | Encontros dos Grupos em que participa |
| Facilitador | Convidados visíveis em `/convidados` | Encontros do Grupo que facilita |
| Admin | Qualquer convidado | Qualquer encontro da rede |

O reconvite (`reinvite_guest_to_meeting`) registra uma `guest_participations` com
`status=invited` e devolve a mensagem pronta para WhatsApp. **A autoria continua com quem
convidou primeiro** (`invited_by` original), portanto os 15 pontos de presença seguem para esse
membro. Não cria conta, presença nem promoção. O Admin também pode mover a presença de um
convidado para encontro de **outro Grupo** (`move_guest_attendance`); o Facilitador segue
limitado ao próprio Grupo.

### 1. Fluxo de Convite e Cadastro

Antes de gerar um código, a plataforma resolve a identidade por email/telefone. Reutiliza um
convite válido, renova um vencido ou, se a pessoa já for Convidada ativa, registra somente uma
nova participação. Pessoas com papel Admin, Facilitador ou Membro ativo não recebem outro
convite de ativação. `guest_participations` mantém visitas recorrentes separadas de conta,
presença, promoção e pontos.

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
│                                        │ 4. Email confirm│                   │
│                                        └────────────────┘                    │
│                                                   │                          │
│                                                   ▼                          │
│                                        ┌────────────────┐                    │
│                                        │ /auth/confirm  │                    │
│                                        │ Callback de    │                    │
│                                        │ confirmação:   │                    │
│                                        │ 1. Troca token │                    │
│                                        │ 2. Accept invite│                   │
│                                        │ 3. Role=convidado│                  │
│                                        │ 4. Snapshot teams│                  │
│                                        └────────────────┘                    │
│                                                   │                          │
│                                                   ▼                          │
│                                        ┌────────────────┐                    │
│                                        │ Status: CONVIDADO│                  │
│                                        │ Aguarda promoção│                   │
│                                        └────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tabelas:** `invitations`, `guest_participations`, `auth.users`, `profiles`, `user_roles`  
**Funções:** `create_guest_invitation()`, `renew_guest_invitation()`, `handle_new_user()`, `accept_invitation()` (idempotente, com snapshot de `allowed_team_ids`)  
**Edge Functions:** `verify-turnstile` (anti-bot), `send-notification` (tipo: invitation)  
**Rota:** `/auth/confirm` — callback público para confirmação de email e aceite do convite

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

Desativação registra o papel anterior e separa Ex-Convidado de Ex-Membro. Reativação, promoção,
nova participação ou nova presença cancela itens futuros da régua; mensagens anteriores ficam
no histórico. Cada nova ausência/desativação pode abrir outro ciclo.

---

## Fluxos de Atividades

### Gente em Ação (Reuniões 1-a-1)

#### Solicitação entre membros

```text
MatchMaking ou perfil do membro → Agendar Gente em Ação → grava solicitação
→ envia e-mail + notificação interna → oferece abrir WhatsApp, copiar mensagem
ou concluir sem WhatsApp → destinatário confirma ou recusa na aba Agendamentos
```

O WhatsApp é um reforço manual: a plataforma abre a conversa com texto sugerido e editável.
Ela registra somente a abertura, não presume envio, entrega ou leitura. Sem telefone válido no
perfil, a opção de copiar permanece disponível. Essa etapa não cria pontos ou tentativas extras.

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

---

## Consulta de Convidados (v3.6.0)

Membros, facilitadores e admins têm duas superfícies de consulta para o banco de leads/visitantes:

### `/convidados` — Diretório de convidados ativos
- Lista todos os usuários com `role = 'convidado'` (ativos), agrupados por status:
  - **Aguardando primeiro encontro** (sem attendances)
  - **Já participou** (1+ attendances)
  - **Promovido a membro** (oculto por padrão; toggle "Mostrar promovidos")
- Filtros: busca (nome/empresa/email), grupo, status.
- Cada card: avatar, empresa, segmento, grupo, quem convidou, data do convite, contagem de encontros.
- **Link "Ver perfil"** abre `/membro/:slug` (perfil completo).
- **Botão "Gerenciar"** (visível apenas para admin/facilitador) abre `/admin/pessoas` para promover/transferir/desativar.
- Convidados são redirecionados para `/`.

### `/encontros` — Aba "Convidados em Encontros"
- Histórico completo (passados + futuros, todos os grupos) de convidados confirmados em encontros.
- Inclui também usuários **já promovidos a membro** que entraram originalmente via convite (rastreabilidade).
- Filtros: busca livre, grupo, período (todos / próximos / anteriores).
- Cada card de convidado mostra: nome, empresa, segmento, **email clicável (mailto:)**, **WhatsApp clicável (wa.me)**, quem convidou, badge "membro" se promovido, e link "Ver perfil".
- Objetivo: banco de consulta para reativação de leads e follow-up direto pelos membros.



## v3.51.0 — Indicadores e agendamento WhatsApp

- `get_statistics_snapshot` valida identidade ativa e escopo no servidor: Admin/Facilitador consultam comunidade; Membro consulta seus Grupos; Convidado somente dados pessoais. Sem contatos ou dados CRM na resposta.
- `src/lib/statistics.ts` unifica denominador (Membro/Facilitador ativo, sem Admin), contagem por autoria, recebimentos separados, datas de evento e presenças únicas por pessoa/encontro.
- Totais da Comunidade e relatório gerencial são históricos dos perfis atualmente ativos; filtros de Grupo usam vínculo atual. Grupos com vínculos sobrepostos não devem ser somados como população global.
- Minhas Estatísticas aplica mês/ano aos totais; gráfico mantém últimos seis meses. Presença usa data do encontro, não data de lançamento.
- Facilitador abre Comunidade e também acessa Relatório Global; Admin mantém sua aba inicial. Falhas de leitura têm mensagem de erro, não falso zero.
- Dashboard usa a mesma fonte para atividades, membros, ranks e Grupos. Taxa de presença considera membros ativos do Grupo do encontro, exclui convidados, duplicatas e encontros futuros. É taxa operacional com vínculo atual, não reconstrução de matrícula histórica.
- Ranking competitivo permanece distinto e exclui Facilitadores; não foram alterados pontos, convites, presenças ou regras de Resgate.
- Designação de Facilitador sincroniza papel no banco; Admin preservado; Convidado precisa promoção prévia. Leitura de múltiplos papéis usa prioridade explícita.
- Modal WhatsApp ajusta largura entre etapas, altura máxima de 90dvh, rolagem, quebra de texto e ações verticais no celular. Mensagem editável alimenta cópia e link wa.me; domínio Cloudflare mantido.
- Validação visual isolada com envio simulado: 360/768/1280px sem transbordamento ou erros JavaScript. Validação autenticada Admin/Facilitador não disponível no Supabase externo.
- Segurança: alerta 0029 da RPC revisado como acesso autenticado intencional, com limites internos; 161 alertas anteriores não foram alterados.
- Bloco 2 — Assinante da Comunidade permanece sem implementação e reservado à execução exclusiva.


## v3.51.1 — Recuperação de atualização PWA

Instalação mantida via manifest/ícones, sem alterar URLs de instalação. Cache offline do aplicativo suspenso durante recuperação. Worker antigo em `/sw.js` substituído por limpeza seletiva que se desregistra mesmo em falha e solicita nova navegação dos clientes. Sem apagar autenticação, caches de outros serviços, dados locais ou histórico da plataforma. Nenhum registro de worker de aplicativo no preview/produção, polling de versão ou recarga automática por falha de chunk. Notificações locais não aguardam worker inexistente. Publicação e validação do worker substituto no Cloudflare são necessárias; atualização depende da verificação feita pelo navegador.

## v3.53.0 — Vitrine da Comunidade e franquia do MatchMaking

- `/vitrine` é exclusiva para Assinantes e Convidados ativos e lista apenas esses dois públicos, sem leads, pré-ativação, Membros, Facilitadores ou Admins.
- O MatchMaking do Assinante usa somente perfis da vitrine; o de Membros preserva o universo anterior sem Admins.
- A sugestão semanal é orgânica e não consome franquia. O botão "Sortear nova conexão" registra `matchmaking_draw` em `usage_quota_events`, sem duplicar o mesmo contato no mês.
- Planos ativos com `matchmaking_monthly_quota` limitam os sorteios; Assinante sem assinatura ativa ou sem franquia não sorteia. Membros ainda sem plano mantêm o comportamento atual até a Fase 4.
- Assinante pode agendar e registrar tentativa de contato, mas não usa o botão "Já conectei" nem entra na gamificação de Membros.
