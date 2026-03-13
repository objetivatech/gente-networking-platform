

## Plano Revisado — 8 Correções e Melhorias

O Worker do Cloudflare **está funcionando corretamente** (80 Success, 0 Errors confirmado no dashboard). O problema de dados não aparecerem (Ponto 3) não é do Worker — é do **cliente frontend**: o `supabaseReadOnly` cria uma instância Supabase separada que **não compartilha a sessão de autenticação** com o cliente principal. Isso faz com que as queries protegidas por RLS retornem arrays vazios (o Worker repassa a request, mas sem token de auth válido).

---

### 1. Fix Urgente — `supabaseReadOnly` sem sessão auth (Ponto 3)

**Arquivo**: `src/integrations/supabase/client.ts`

**Causa raiz**: `createClient(PROXY_URL, ...)` cria um client independente. Mesmo com `persistSession: true`, a sessão OAuth é vinculada ao domínio/URL do Supabase original. O segundo client nunca recebe o token JWT → RLS bloqueia tudo.

**Solução**: Tornar `supabaseReadOnly` um alias direto para `supabase`. O proxy de cache deve ser ativado configurando `VITE_SUPABASE_URL` para apontar ao Worker (ou o Worker opera de forma transparente como proxy reverso sem necessidade de segundo client).

```typescript
export const supabaseReadOnly = supabase;
```

Isso restaura imediatamente membros, grupos e eventos em toda a aplicação.

---

### 2. Componente de Diagnóstico de Cache (Ponto 1)

**Novo arquivo**: `src/components/AdminCacheDiagnostics.tsx`  
**Integrar em**: `src/pages/Admin.tsx`

Componente que usa `fetch()` nativo (não Supabase client) para fazer GET ao `PROXY_URL` + endpoints cacheáveis e exibe:
- Status do endpoint (online/offline)
- Header `X-Cache` (HIT/MISS/BYPASS)
- Header `X-Cache-TTL`
- Latência de resposta

Visível apenas para admins. Inclui botão "Testar Cache" e botão "Purgar Cache" (POST ao `/purge`).

---

### 3. Documentação e Changelog (Ponto 2)

**Arquivos**:
- `src/pages/Documentacao.tsx`: Adicionar seção "Arquitetura de Performance" explicando o Cloudflare Worker proxy, TTLs e como funciona o cache de borda.
- `src/pages/Changelog.tsx`: Adicionar entrada para a integração do proxy e as correções desta rodada.
- Migration SQL: Inserir registro na tabela `system_changelog`.

---

### 4. Unificar /membros e /grupos (Ponto 4)

**Arquivos**: `src/pages/Membros.tsx`, `src/components/layout/Sidebar.tsx`, `src/App.tsx`

- Na página `/membros` (738 linhas), adicionar componente `Tabs` com duas abas: "Membros" (conteúdo atual) e "Grupos" (conteúdo de `Equipes.tsx`)
- No `Sidebar.tsx` linha 52: remover `{ icon: Users, label: 'Grupos', path: '/equipes' }`
- No `App.tsx`: manter rota `/equipes` como redirect para `/membros?tab=grupos`

---

### 5. Links do sininho → /feed (Ponto 5)

**Arquivo**: `src/components/layout/Header.tsx`

- Linha 139: `onClick={() => setOpen(false)}` → adicionar `navigate('/feed')` antes de fechar
- Linha 166: `<Link to="/">` → `<Link to="/feed">`

---

### 6. Atualizar ScoringRulesCard (Ponto 6)

**Arquivo**: `src/components/ScoringRulesCard.tsx`

O array `scoringRules` tem apenas 6 itens. Adicionar:
- `{ icon: MessageCircle, label: 'Conselho 24/7', points: '5-10 pts', description: '5 pts resposta + 5 pts melhor' }`
- `{ icon: Briefcase, label: 'Case de Negócio', points: '15 pts', description: 'por case publicado' }`

---

### 7. Verificar mecânicas de gamificação (Ponto 7)

Consultar o banco de dados para verificar se os triggers de pontuação existem para:
- `council_replies` (INSERT → update_all_monthly_points_for_user)
- `business_cases` (INSERT → update_all_monthly_points_for_user)
- `council_replies.is_best_answer` (UPDATE → bonus points)

Se faltarem, criar via migration SQL. A função `calculate_monthly_points_for_team` já contém a lógica para as 8 atividades — o que pode faltar são os triggers que a invocam.

---

### 8. Responsividade Mobile (Ponto 8)

Auditoria global nos seguintes componentes/páginas:

| Arquivo | Problema | Correção |
|---|---|---|
| `src/components/layout/MainLayout.tsx` | Container pode não ter overflow-x-hidden | Adicionar `overflow-x-hidden` no wrapper principal |
| `src/pages/Estatisticas.tsx` | Grids e tabelas extrapolam | `grid-cols-1 sm:grid-cols-2`, tabelas em `overflow-x-auto` |
| `src/pages/Ranking.tsx` | Filtros lado a lado em mobile | `flex-col sm:flex-row` nos selects |
| `src/pages/Index.tsx` | Cards de ação rápida | Verificar grid `grid-cols-2` e padding |
| `src/pages/Membros.tsx` | Diálogos e cards | `max-w-[calc(100vw-2rem)]` nos dialogs |
| `src/pages/Encontros.tsx` | Cards de encontro | Garantir `w-full` e `break-words` |
| `src/components/layout/BottomNav.tsx` | Posição fixa | Confirmar `fixed bottom-0 left-0 right-0 z-50` e que nada o sobrepõe |
| `src/components/MonthlyPointsSummary.tsx` | Pode transbordar | `overflow-hidden` e `truncate` |

Correção global: adicionar no `src/App.css` ou no wrapper do `MainLayout`:
```css
html, body, #root { overflow-x: hidden; max-width: 100vw; }
```

---

### Ordem de Execução

1. Fix `supabaseReadOnly = supabase` (restaura app inteiro)
2. Verificar/criar triggers de gamificação (migration SQL)
3. Atualizar `ScoringRulesCard` com 8 atividades
4. Fix links sininho → `/feed`
5. Unificar `/membros` + `/grupos` em Tabs
6. Responsividade mobile global
7. Componente `AdminCacheDiagnostics`
8. Documentação e Changelog

