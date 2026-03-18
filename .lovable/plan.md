

## Plano: Padronização de Nomenclatura + Auditoria de Gamificação

### Contexto do Problema

O sistema mistura dois significados da palavra "Convidado":
1. **Role do sistema**: Usuário com papel `convidado` (pessoa que aceitou um convite e ainda não foi promovida a Membro)
2. **Contexto do Gente em Ação**: "Com Convidado" = reunião com pessoa externa (fora do grupo), que pode ser alguém de fora do sistema OU um usuário com qualquer role

Isso causa confusão no feed, onde mensagens como "Reunião com convidado: Maria" aparecem mesmo quando Maria é uma Membro ativa. Além disso, labels e badges usam "Convidado" indiscriminadamente.

---

### 1. Padronização da Terminologia no Gente em Ação

O `meeting_type` no banco tem valores `'membro'` e `'convidado'`. Proposta: manter os valores no banco (não alterar dados existentes), mas mudar TODA a nomenclatura visual:

| Atual | Novo |
|---|---|
| "Com Convidado" (radio button) | "Com Pessoa Externa" |
| "Convidado" (badge na listagem) | "Externo" |
| "Com Convidados" (stat card) | "Com Externos" |
| "convidados" no sub-texto stats | "externos" |
| "Nome do Convidado" (form label) | "Nome da Pessoa" |

**Arquivos afetados**:
- `src/pages/GenteEmAcao.tsx` — radio labels, badges, stat cards, form labels
- `src/pages/Estatisticas.tsx` — linha 23: `${stats?.genteEmAcao.withGuests || 0} convidados` → `externos`
- `src/pages/AdminRegistros.tsx` — badge "Convidado" → "Externo"
- `src/pages/Documentacao.tsx` — "Com Convidado" → "Com Pessoa Externa"

### 2. Correção dos Triggers SQL (Activity Feed)

Os triggers geram mensagens hardcoded com terminologia incorreta.

**`handle_gente_em_acao_insert`**: Atualmente escreve `'Reunião com convidado: ' || guest_name`. Corrigir para `'Reunião com pessoa externa: ' || guest_name` (quando `meeting_type='convidado'`).

**`handle_guest_attendance_insert`**: Escreve `inviter_name || ' ganhou pontos por convidado'`. Corrigir para `inviter_name || ' ganhou pontos — convidado presente no encontro'` com a descrição mostrando o nome correto.

**`handle_invitation_accepted`**: Escreve `'Novo membro através de convite'`. OK — manter.

**`handle_council_post_insert`**: OK — sem problemas de nomenclatura.

**`handle_profile_update`**: OK.

**Migration SQL**: Criar uma migration que faça `CREATE OR REPLACE FUNCTION` para os triggers afetados.

### 3. Labels no Feed e ActivityFeed

**`src/pages/Feed.tsx`** e **`src/components/ActivityFeed.tsx`**:
- `guest_attendance` label: "Convidado presente" → "Convidado no Encontro" (aqui "Convidado" é correto pois refere-se ao papel)
- Manter os demais labels — estão corretos

### 4. Email Templates

**`supabase/functions/_shared/email-templates.ts`**:
- Linha 199: "Quando o convidado comparecer a um encontro, você ganha mais 15 pontos." — OK, aqui "convidado" refere-se corretamente à pessoa convidada
- `guestAttendedEmailTemplate`: "Seu convidado compareceu!" — OK, contexto correto
- Todos os emails usam "convidado" no sentido correto (pessoa que foi convidada). Sem alterações necessárias nos emails.

### 5. ScoringRulesCard

**`src/components/ScoringRulesCard.tsx`**:
- "por convidado presente" — OK, refere-se ao papel. Manter.

### 6. Outras páginas com nomenclatura

**`src/pages/Membros.tsx`**:
- Badge "Convidado" para role='convidado' — CORRETO, é a role

**`src/pages/GerenciarMembros.tsx`**:
- Badge "Convidado" para quem tem role='convidado' — CORRETO

**`src/pages/Encontros.tsx`**:
- "Convidados Presentes" na lista de presença — CORRETO, são pessoas com role convidado

### 7. Auditoria da Gamificação

Verificar `calculate_monthly_points_for_team` contra as regras documentadas:

| Ação | Esperado | No código SQL | Status |
|---|---|---|---|
| Gente em Ação | 25 pts | `gente_count * 25` | OK |
| Depoimento dado | 15 pts | `testimonial_count * 15` | OK |
| Indicação feita | 20 pts | `referral_count * 20` | OK |
| Presença | 20 pts | `attendance_count * 20` | OK |
| Negócio fechado | 5 pts/R$100 | `FLOOR(deals_value / 100) * 5` | OK |
| Convidado presente | 15 pts | `invitation_count * 15` | OK |
| Case de Negócio | 15 pts autor | `business_case_count * 15` | OK |
| Resposta Conselho | 5 pts | `council_reply_count * 5` | OK |
| Melhor resposta | +5 pts | `best_answer_count * 5` | OK |
| Admin/Facilitador | 0 pts | `IF user_role IN ('admin','facilitador') RETURN 0` | OK |

**Possível problema**: Na função `calculate_monthly_points_for_team`, o case de negócio com indicador deveria dar 20 pts para o indicador, mas a lógica no trigger `handle_business_case_insert` chama `update_all_monthly_points_for_user(referrer_id)` — porém NÃO há contagem de "cases indicados" na função de cálculo. O indicador só recebe pontos se ele próprio criou um case. **Isso é um bug** — o referrer do deal associado ao case deveria receber 20 pts pelo case, mas `calculate_monthly_points_for_team` não tem essa contagem.

**Correção necessária**: Adicionar na função `calculate_monthly_points_for_team` a contagem de cases onde o `business_deal.referred_by_user_id = _user_id` (20 pts para o indicador do negócio associado ao case).

### 8. Documentação e Changelog

Atualizar `docs/TECHNICAL_DOCUMENTATION.md` e `/changelog` com:
- Padronização de nomenclatura "Externo" vs "Convidado"
- Correção do cálculo de pontos para indicadores de cases

---

### Ordem de Execução

1. Migration SQL: corrigir triggers `handle_gente_em_acao_insert` e `handle_guest_attendance_insert` + adicionar pontuação de indicador no `calculate_monthly_points_for_team`
2. UI: Atualizar GenteEmAcao.tsx, Estatisticas.tsx, AdminRegistros.tsx, Documentacao.tsx com nova terminologia
3. Feed labels: ajustar Feed.tsx e ActivityFeed.tsx
4. Documentação e changelog

