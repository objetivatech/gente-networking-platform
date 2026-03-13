

## Plano de Correções — Eventos, Feed, Cases e Responsividade

### 1. Ordenação de Eventos (Encontros + GuestWelcome)

**Problema**: `useMeetings.ts` linha 37 usa `ascending: false` (mais recente primeiro). O correto é `ascending: true` para próximos eventos, com separação já feita no frontend.

**Correção**:
- `src/hooks/useMeetings.ts`: Alterar order para `ascending: true`
- `src/pages/Encontros.tsx`: Ordenar `upcomingMeetings` por data ascendente e `pastMeetings` por data descendente (via `.sort()` no frontend)
- `src/hooks/useGuestData.ts`: Já usa `ascending: true` — OK. Verificar que a ordenação está correta na página `GuestWelcome.tsx`

---

### 2. Lista de Convidados por Encontro

**Problema**: A `AttendeesList` mostra apenas membros confirmados (da tabela `attendances`). Não há relação de **convidados (guests)** — pessoas convidadas via `invitations` que confirmaram presença em cada encontro.

**Correção**:
- Na `AttendeesList` do `Encontros.tsx`, além dos attendees (membros), buscar convidados que confirmaram presença no mesmo encontro
- Separar visualmente: "Membros confirmados" e "Convidados presentes"
- Exibir dados de contato (telefone, email) dos convidados obtidos da tabela `profiles` (ou `invitations`)
- Isso já é acessível via o botão `<Users>` que expande `AttendeesList` — basta enriquecer o componente

---

### 3. Filtros do Feed

**Problema**: O filtro por período usa `startOfMonth(subMonths(new Date(), monthsBack))` mas o valor `'0'` (Este mês) gera `startOfMonth(subMonths(now, 0))` = início do mês atual. Porém o `limit(200)` pode cortar resultados. O filtro por grupo não funciona porque a maioria dos registros tem `team_id = null`.

**Correção**:
- Período: O filtro server-side com `.gte()` parece correto. O problema é que "Este mês" é o padrão e filtra corretamente, mas ao selecionar "Todo o período" com `periodFilter = 'all'`, o limite de 200 pode ser insuficiente. Aumentar para 500 e garantir que a query recarregue ao mudar filtro (queryKey já inclui `periodFilter` — OK).
- Grupo: O problema real é que `team_id` é null na maioria dos registros antigos. Quando se seleciona um grupo, o filtro atual inclui `team_id === null` junto com o grupo selecionado — isso mostra tudo. A correção deve filtrar server-side via `.eq('team_id', teamFilter)` ou `.or()` para incluir nulls, mas a lógica precisa ser: ao filtrar por grupo, mostrar APENAS registros daquele grupo (excluindo nulls), ou opcionalmente incluir registros globais.
- Solução: Adicionar `teamFilter` ao queryKey e ao filtro server-side. Para o filtro por grupo, usar `.eq('team_id', teamFilter)` quando um grupo está selecionado, filtrando no servidor ao invés de no client-side.

---

### 4. Cases vinculados a Negócios

**Problema**: O formulário de Case em `/perfil` não tem vínculo com negócios. O fluxo correto é: 1º registra negócio em `/negocios`, 2º cria case vinculado ao negócio.

**Correção**:
- `src/pages/Profile.tsx`: No dialog de novo case, adicionar um `Select` para escolher o negócio (`business_deal_id`) entre os negócios do usuário (usar `useBusinessDeals`)
- Se não há negócios registrados, desabilitar o botão "Novo Case" com tooltip explicativo
- O campo `business_deal_id` já existe na tabela `business_cases`
- Hook `useBusinessCases.ts`: Garantir que `business_deal_id` é passado no `createCase`

---

### 5. MemberSelect transbordando no desktop

**Problema**: No dialog de `/negocios`, o `MemberSelect` (dropdown com avatares) ultrapassa a largura do dialog.

**Correção**:
- `src/components/MemberSelect.tsx`: Adicionar `className="overflow-hidden"` no `SelectContent` e `max-w-full truncate` nos itens
- Limitar largura do `SelectItem` conteúdo com `overflow-hidden text-ellipsis`

---

### 6. Responsividade Mobile Global

Auditoria e correções em:

| Página/Componente | Problema | Correção |
|---|---|---|
| `Negocios.tsx` | Dialog form grid-cols-2 em mobile | `grid-cols-1 sm:grid-cols-2` |
| `Negocios.tsx` | Stats grid-cols-2/4 comprime valores | `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` |
| `Profile.tsx` | Stats grid comprime | `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` |
| `Encontros.tsx` | Botões lado a lado comprimem | `flex-wrap` nos botões |
| `Feed.tsx` | Filtros já ajustados — confirmar |
| `Membros.tsx` | Dialog cards | Confirmar `max-w-[calc(100vw-2rem)]` |
| `MemberSelect` | Itens com avatar+nome+empresa overflow | Truncate text |
| `GuestWelcome.tsx` | Cards de encontro | `w-full` e `break-words` |

---

### Ordem de Execução

1. Fix ordenação de eventos (`useMeetings.ts` + `Encontros.tsx`)
2. Enriquecer `AttendeesList` com convidados e dados de contato
3. Fix filtros do Feed (server-side team filter + queryKey)
4. Vincular Cases a Negócios no Profile
5. Fix MemberSelect overflow
6. Responsividade mobile global

