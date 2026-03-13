
# Plano: Sistema de Gamificação Mensal por Grupo

## Resumo Executivo

Este plano implementa uma **reformulação completa do sistema de gamificação** para operar com ciclos mensais e pontuação por grupo, conforme solicitado. As principais mudanças são:

1. **Pontos zerados mensalmente** - A cada novo mês, inicia-se um novo ciclo de pontuação
2. **Histórico de pontos mensais** - Consulta de desempenho de meses anteriores
3. **Pontuação por grupo** - Membros que pertencem a múltiplos grupos têm pontuação separada em cada um
4. **Rankings mensais** - Exibição sempre do mês corrente, global e por grupo

---

## Arquitetura da Solução

### Nova Estrutura de Dados

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MODELO DE DADOS - PONTUAÇÃO MENSAL                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ANTES (atual):                                                             │
│  ┌─────────────┐                                                            │
│  │ profiles    │                                                            │
│  │ - points    │  ← Pontos acumulados globalmente, sem contexto de grupo   │
│  │ - rank      │                                                            │
│  └─────────────┘                                                            │
│                                                                             │
│  DEPOIS (proposto):                                                         │
│  ┌─────────────────────┐                                                    │
│  │ monthly_points      │  (NOVA TABELA)                                     │
│  │ - user_id           │                                                    │
│  │ - team_id           │  ← Pontuação POR GRUPO                            │
│  │ - year_month        │  ← Ex: "2026-02" (ciclo mensal)                   │
│  │ - points            │  ← Total de pontos do mês para este grupo         │
│  │ - rank              │  ← Rank calculado para este mês/grupo             │
│  │ - updated_at        │                                                    │
│  └─────────────────────┘                                                    │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────┐                                                    │
│  │ points_history      │  (ATUALIZADA)                                      │
│  │ - user_id           │                                                    │
│  │ - team_id           │  ← NOVO: Contexto do grupo                        │
│  │ - year_month        │  ← NOVO: Mês de referência                        │
│  │ - activity_type     │                                                    │
│  │ - points_change     │                                                    │
│  │ - created_at        │                                                    │
│  └─────────────────────┘                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detalhamento Técnico

### 1. Alterações no Banco de Dados

#### 1.1 Nova tabela: `monthly_points`
```sql
CREATE TABLE monthly_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- formato "YYYY-MM"
  points INTEGER NOT NULL DEFAULT 0,
  rank member_rank DEFAULT 'iniciante',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, team_id, year_month)
);
```

#### 1.2 Alterações na tabela `points_history`
Adicionar colunas:
- `team_id UUID` - Para contexto do grupo
- `year_month TEXT` - Para vincular ao mês

#### 1.3 Novas funções de banco de dados

| Função | Descrição |
|--------|-----------|
| `get_current_year_month()` | Retorna "YYYY-MM" atual |
| `calculate_monthly_points(user_id, team_id, year_month)` | Calcula pontos de um usuário em um grupo/mês |
| `update_monthly_points_and_rank(user_id, team_id)` | Atualiza a tabela monthly_points |
| `get_monthly_ranking(team_id, year_month)` | Retorna ranking ordenado |

#### 1.4 Atualização dos Triggers
Todos os triggers de atividades (gente_em_acao, testimonials, referrals, etc.) precisam:
1. Identificar o grupo do contexto da atividade
2. Chamar `update_monthly_points_and_rank()` para cada grupo do usuário

### 2. Lógica de Contexto de Grupo

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│           COMO DETERMINAR O GRUPO DE UMA ATIVIDADE?                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ATIVIDADE              │  LÓGICA DE GRUPO                                  │
│  ───────────────────────┼──────────────────────────────────────────────────│
│  Presença (attendances) │  Grupo do encontro (meetings.team_id)            │
│                         │  Se encontro sem grupo: todos os grupos do user  │
│                         │                                                   │
│  Gente em Ação          │  Grupo em comum com o parceiro, ou               │
│                         │  todos os grupos do usuário se com convidado     │
│                         │                                                   │
│  Depoimentos            │  Grupo em comum entre from_user e to_user        │
│                         │  Se múltiplos: pontua em cada um                 │
│                         │                                                   │
│  Indicações             │  Grupo em comum entre from_user e to_user        │
│                         │                                                   │
│  Negócios               │  Todos os grupos do usuário que fechou           │
│                         │                                                   │
│  Convites               │  Grupo do convidador                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Alterações no Frontend

#### 3.1 Página de Ranking (`/ranking`)
- Adicionar seletor de mês (padrão: mês atual)
- Filtro por grupo (já existe, manter)
- Exibir claramente "Ranking de [Mês/Ano]"
- Remover exibição de pontos globais/acumulados

#### 3.2 Perfil do Usuário (`/perfil`)
- Substituir "pontos totais" por "pontos do mês"
- Adicionar seletor de grupo (se pertence a múltiplos)
- Gráfico de evolução: mostrar mês a mês

#### 3.3 Dashboard (`/`)
- Exibir pontos do mês atual
- Se usuário pertence a múltiplos grupos, mostrar resumo por grupo

#### 3.4 Histórico de Pontos
- Adicionar filtros: mês e grupo
- Agrupar histórico por mês com totais

#### 3.5 Estatísticas (`/estatisticas`)
- Ajustar para refletir dados mensais

### 4. Novos Hooks

| Hook | Descrição |
|------|-----------|
| `useMonthlyRanking(teamId?, yearMonth?)` | Rankings mensais por grupo |
| `useMonthlyPoints(userId, teamId?)` | Pontos do usuário no mês/grupo |
| `usePointsHistoryByMonth(userId, yearMonth?)` | Histórico filtrado por mês |

### 5. Migração de Dados Existentes

A migração não irá "converter" os pontos antigos, pois o modelo era diferente. Opções:

1. **Zerar e começar do zero** - Simples, mas perde histórico
2. **Migrar como "mês genérico"** - Criar um registro especial para pontos legados
3. **Manter pontos antigos apenas para consulta** - Recomendado

**Recomendação:** Manter os campos `points` e `rank` na tabela `profiles` como "pontos históricos/legados" e usar o novo sistema a partir do mês de implementação.

---

## Cronograma de Implementação

### Fase 1: Estrutura de Dados
- [ ] Criar tabela `monthly_points`
- [ ] Adicionar colunas à `points_history`
- [ ] Criar índices para performance
- [ ] Criar funções de cálculo mensal
- [ ] Atualizar triggers das atividades

### Fase 2: Backend/Hooks
- [ ] Criar `useMonthlyRanking`
- [ ] Criar `useMonthlyPoints`
- [ ] Atualizar `usePointsHistory`
- [ ] Atualizar `useStats` para contexto mensal

### Fase 3: Frontend
- [ ] Atualizar página Ranking
- [ ] Atualizar página Perfil
- [ ] Atualizar Dashboard
- [ ] Atualizar Estatísticas

### Fase 4: Documentação
- [ ] Atualizar USER_FLOWS.md
- [ ] Atualizar TECHNICAL_DOCUMENTATION.md
- [ ] Atualizar página /documentacao
- [ ] Adicionar entrada no Changelog

---

## Considerações e Melhorias Sugeridas

### Melhorias Adicionais (Opcionais)

1. **Notificações de Reset Mensal**
   - Enviar email no início de cada mês informando pontuação final do mês anterior

2. **Badges de Conquistas Mensais**
   - Criar badges visuais para "Top 3 do mês" em cada grupo

3. **Comparativo Mês-a-Mês**
   - Gráfico comparando desempenho entre meses

4. **Meta Mensal**
   - Permitir que o usuário defina uma meta de pontos para o mês

5. **Leaderboard em Tempo Real**
   - Usar Supabase Realtime para atualizar ranking ao vivo

### Pontos de Atenção

- **Performance**: Com pontuação por grupo/mês, o volume de dados aumenta. Índices adequados são essenciais.
- **Retroatividade**: Atividades registradas devem ser contabilizadas no mês em que ocorreram (`meeting_date`, `deal_date`), não na data de criação.
- **Membros sem grupo**: Precisam ser tratados (não recebem pontos ou recebem em um "grupo geral"?).

---

## Resumo das Entregas

| Item | Descrição |
|------|-----------|
| **Nova tabela** | `monthly_points` para armazenar pontuação mensal por grupo |
| **Colunas novas** | `team_id` e `year_month` em `points_history` |
| **Funções SQL** | Cálculo e atualização de pontos mensais |
| **Triggers atualizados** | Todas as 6 atividades com lógica de grupo |
| **Hooks React** | `useMonthlyRanking`, `useMonthlyPoints` |
| **Páginas atualizadas** | Ranking, Perfil, Dashboard, Estatísticas |
| **Documentação** | USER_FLOWS.md, TECHNICAL_DOCUMENTATION.md, /documentacao, Changelog |
