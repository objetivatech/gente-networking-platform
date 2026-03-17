## Plano de Correções e Melhorias — 6 Itens + Documentação

---

### 1. Correção dos contadores de Negócios no "Comparativo por Grupo" (Estatísticas)

**Problema identificado**: Em `useStats.ts`, linha 103, a query de `business_deals` seleciona apenas `value, deal_date` — **sem `closed_by_user_id**`. Na seção `perTeam` (linha 163), o código tenta filtrar por `(d as any).closed_by_user_id`, que é `undefined` porque o campo não foi selecionado. Resultado: 0 negócios e R$0 para todos os grupos.

**Correção**:

- `useCommunityStats`: Adicionar `closed_by_user_id` ao select de `business_deals` (linha 103)
- Corrigir também `depoimentos` no `perTeam` (linha 166) que está hardcoded como `filter(() => false)` — substituir por filtro real usando `from_user_id`
- Na query de testimonials, incluir `from_user_id` no select

**Admin Global Tab** (`useAdminGlobalStats`): Aparentemente correto — já seleciona `closed_by_user_id`. Verificar se o problema é de cache (staleTime) ou se há limite de 1000 rows cortando dados.

---

### 2. Auditoria Completa dos Contadores

Há múltiplos locais que calculam contagens. Todos devem ser consistentes:


| Local                   | Hook/Componente                 | Ação                                                                                       |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| Dashboard Admin         | `useAdminDashboard.ts`          | Verificar contagem de council_replies e business_cases (ausentes nos stats gerais)         |
| Estatísticas Comunidade | `useCommunityStats`             | Fix deals (item 1). Adicionar depoimentos e conselho ao perTeam                            |
| Estatísticas Admin      | `useAdminGlobalStats`           | Verificar limite 1000 rows — se há mais de 1000 negócios/perfis/etc, dados serão truncados |
| Cards do Perfil         | `Profile.tsx`                   | Verificar se contadores pessoais batem com useStats                                        |
| Admin Dashboard KPIs    | `useAdminDashboard.ts` teamKpis | Não inclui council_replies nem business_cases — adicionar                                  |


**Ações**:

- Adicionar `totalCouncilReplies` e `totalBusinessCases` ao `useAdminDashboard` stats
- No `teamKpis`, adicionar contagem de `council_replies` e `business_cases` por grupo
- Garantir que nenhuma query ultrapasse o limite de 1000 rows sem paginação (adicionar `.limit(10000)` ou usar `count: 'exact'` onde aplicável)

---

### 3. Trigger para Council Posts no Activity Feed

**Problema**: Não existe trigger `handle_council_post_insert` no banco de dados. Quando um tópico é criado no Conselho 24/7, nenhum registro é adicionado ao `activity_feed`. Apenas respostas (`council_reply`) geram atividade (via `handle_council_reply_insert`).

**Correção**: Criar uma SQL function + trigger:

```sql
CREATE FUNCTION handle_council_post_insert()
  -- Insere no activity_feed com tipo 'council_post'
  -- Título: "{nome} abriu um desafio no Conselho 24/7"
  -- Descrição: título do post

CREATE TRIGGER on_council_post_insert
  AFTER INSERT ON council_posts
  FOR EACH ROW EXECUTE FUNCTION handle_council_post_insert();
```

- Adicionar `council_post` ao `activityTypeConfig` em `Feed.tsx` com ícone `Lightbulb` e label "Desafio no Conselho"

---

### 4. Atividade no Feed ao Atualizar Perfil

**Problema**: Não existe trigger para `profiles` UPDATE gerando atividade no feed.

**Correção**: Criar trigger que detecta mudanças significativas no perfil (não disparar para atualizações triviais como `updated_at`):

```sql
CREATE FUNCTION handle_profile_update()
  -- Só dispara se houve mudança em campos relevantes:
  -- full_name, company, position, bio, avatar_url, banner_url,
  -- what_i_do, ideal_client, how_to_refer_me, tags
  -- Insere no activity_feed: "{nome} atualizou seu perfil"
  -- activity_type: 'profile_update'
```

- Adicionar `profile_update` ao `activityTypeConfig` em `Feed.tsx`

---

### 5. KPIs do Dashboard filtráveis por Grupo/Membro

**Problema**: O Admin Dashboard (`useAdminDashboard.ts`) mostra KPIs globais sem filtro por grupo. Para apresentações em reuniões de grupo, é necessário poder filtrar.

**Correção**:

- Adicionar um `Select` de grupo no topo do `AdminDashboard.tsx`
- Quando um grupo é selecionado, filtrar todas as métricas (stats, topMembers, monthlyActivity, attendanceKpis) pelos membros daquele grupo
- Refatorar `useAdminDashboard` para aceitar um parâmetro `teamId?` que filtra os dados
- Incluir `councilReplies` e `businessCases` nas métricas do dashboard

---

### 6. Levantamento Completo de Triggers de Email e Push

Baseado na análise do código, aqui está o levantamento completo:

**Emails via Edge Function `send-notification**` (Resend API):


| Momento                        | Tipo                  | Disparado por                               | Destinatário                    |
| ------------------------------ | --------------------- | ------------------------------------------- | ------------------------------- |
| Novo depoimento                | `testimonial`         | `useTestimonials.ts` (client-side)          | Membro que recebeu o depoimento |
| Nova indicação                 | `referral`            | `useReferrals.ts` (client-side)             | Membro que recebeu a indicação  |
| Convite criado                 | `invitation`          | Client-side                                 | Email do convidado              |
| Convite aceito                 | `invitation_accepted` | Client-side                                 | Membro que convidou             |
| Convidado presente em encontro | `guest_attended`      | DB trigger `handle_guest_attendance_insert` | Membro que convidou             |
| Boas-vindas                    | `welcome`             | Client-side (no cadastro)                   | Novo membro                     |


**Edge Function `birthday-notifications**` (via cron ou invocação manual):

- Envia email de parabéns para membros no dia do aniversário

**Push Notifications**: NÃO implementadas. O hook `usePushNotifications.ts` existe no projeto mas não há integração real com service workers ou web push API. É apenas placeholder.

**O que NÃO gera notificação (oportunidades de melhoria)**:

- Novo tópico no Conselho 24/7
- Resposta no Conselho 24/7
- Novo encontro agendado
- Presença confirmada
- Novo negócio fechado
- Novo case publicado
- Atualização de perfil
- Mudança de rank/nível

**APROVADO - Recomendação**: Adicionar disparos de email para pelo menos: novo encontro agendado (notificar membros do grupo), novo tópico no Conselho (notificar membros do grupo), e mudança de rank (parabenizar o membro). - **GOSTEI! PODE IMPLEMENTAR!**

---

### 7. Documentação e Changelog

Após todas as correções:

- Atualizar `docs/TECHNICAL_DOCUMENTATION.md` com novos triggers e fluxos
- Atualizar `docs/USER_FLOWS.md` com diagramas dos novos fluxos de atividade
- Atualizar página `/documentacao` com informações sobre notificações e feed
- Adicionar entrada no `/changelog` com versão nova cobrindo todas as correções

---

### Ordem de Execução

1. Fix contadores de negócios/depoimentos no `useCommunityStats` (item 1 — impacto imediato)
2. Criar trigger `handle_council_post_insert` (item 3 — migration SQL)
3. Criar trigger `handle_profile_update` (item 4 — migration SQL)
4. Auditoria e correção de contadores globais (item 2)
5. Adicionar filtro por grupo no AdminDashboard (item 5)
6. Atualizar Feed.tsx com novos tipos de atividade
7. Documentação e changelog (item 7)

O item 6 (levantamento de triggers) é informativo e já foi respondido acima.