## Diagnóstico da Responsividade

Após analisar as capturas enviadas (Home, Perfil, Membros, Ranking, Encontros) e o CSS/JSX das páginas, os cortes à direita **não são um problema de "viewport móvel"** — são sintomas de um padrão sistêmico no código:

1. **Mascaramento em vez de correção.** `src/App.css` e `src/index.css` aplicam `overflow-x: hidden` em `html/body/#root/main`. Isso **esconde** o overflow, mas o conteúdo continua "vazando" além do container, gerando o corte visível nas capturas (cards de stats, cartão digital, chips de tag, listas de membros).
2. **Containers flex sem `min-w-0`.** Padrão do Tailwind: um filho `flex-1` herda `min-width: auto`, então textos/badges longos empurram o layout. Aparece em Home (cards de stats — `flex items-center gap-3` sem `min-w-0` no bloco de texto), Encontros (título + badges + botão "Confirmado"), Ranking (linhas da classificação).
3. **Strings longas sem quebra.** Segmentos de negócio, tags, e-mails, URLs de Zoom/Meet, nomes compostos ("LinkPlat Assessoria e Gestão Empresarial") não têm `break-words`/`overflow-wrap`. Em Membros e Perfil isso estoura o card. Em Encontros o link do Zoom empurra o card.
4. **Grids fixos demais no mobile.** Home usa `grid-cols-2` para stats: com valores como `R$ 36.8k` + ícone + label, 2 colunas em 360px CSS **não cabem**. Falta um breakpoint `grid-cols-1` para telas muito estreitas ou `min-w-0` nas células.
5. **Botões/tabs sem rolagem controlada.** Tabs ("Sobre / Estatísticas / Cases") e filtros (Membros, Encontros) usam `TabsList` com muitos itens sem `overflow-x-auto` — em iPhone SE isso corta o último.
6. **Cartão Digital e banners com largura fixa.** `DigitalMemberCard` renderiza em dimensões pensadas para desktop; no mobile o botão "Baixar cartão (PNG)" e o QR ficam cortados.

Ou seja: hoje o app **finge ser responsivo** escondendo o overflow. Precisamos remover essa muleta e corrigir na raiz.

---

## Plano de Correção Definitiva

### Etapa 1 — Auditoria e padronização de tokens de responsividade

- Criar utilitários no `src/index.css` para os padrões reutilizáveis:
  - `.text-wrap-anywhere` → `overflow-wrap: anywhere; word-break: break-word;` para strings longas (e-mails, URLs, tags, segmentos).
  - `.stack-safe` → aplica `min-width: 0` em filhos diretos de flex (evita o bug clássico do flex-1).
  - `.hscroll` → `overflow-x: auto; scrollbar-width: thin;` para tabs/filtros horizontais.
- **Remover** `overflow-x: hidden` global de `html/body/#root/main` (App.css + index.css + MainLayout). Fica só como último recurso pontual.
- Adicionar breakpoint `xs: 380px` no `tailwind.config.ts` para lidar com iPhone SE/Galaxy pequenos.

### Etapa 2 — Correções por página (com base nas capturas)

**Home (`src/pages/Index.tsx`)**

- Cards de stats: `grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5`.
- Cada card: adicionar `min-w-0` no bloco de texto, `truncate` no label, `tabular-nums` no valor, permitir quebra em `R$ 36.8k`.
- "Próximos Encontros": link do Zoom com `.text-wrap-anywhere`.

**Perfil (`src/pages/Profile.tsx` + `DigitalMemberCard.tsx`)**

- Tags/segmentos: container `flex flex-wrap gap-2`, cada Badge com `max-w-full break-words`.
- Bio/campos longos com `.text-wrap-anywhere`.
- Cartão Digital: envolver em `w-full overflow-hidden`, redimensionar o layout interno para `flex-col` em `< sm` (QR embaixo do texto), botão "Baixar cartão (PNG)" sempre `w-full`.
- Tabs "Sobre / Estatísticas / Cases": `TabsList` com `.hscroll` e `w-max` para não cortar.

**Membros (`src/pages/Membros.tsx`)**

- `MemberCard`: `min-w-0` no conteúdo, `truncate` no nome/cargo, tags com `flex-wrap` + `break-words`.
- Filtros: `flex flex-wrap gap-2` + `w-full sm:w-auto` nos selects.
- Grid de cards: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`.

**Ranking (`src/pages/Ranking.tsx`)**

- Top 3 em mobile: empilhar (`grid-cols-1 md:grid-cols-3`) — já está, mas os cards de linha (posições 4+) precisam de `min-w-0` + `truncate` no nome/empresa e `shrink-0` na posição/pontos.
- Header: garantir que os selects não estourem (`w-full sm:w-[180px]`).

**Encontros (`src/pages/Encontros.tsx`)**

- `MeetingCard`: header flex vira `flex-col sm:flex-row` no mobile; botão "Confirmado" `w-full sm:w-auto`.
- Location/link do Zoom com `.text-wrap-anywhere` e ícone `shrink-0`.
- Badges de grupo com `max-w-full truncate`.
- Tabs "Encontros / Convidados em Encontros": `.hscroll`.

**Layout global (`MainLayout`, `Header`, `BottomNav`)**

- Garantir `main` sem `overflow-x-hidden`; adicionar `pb-[max(5rem,env(safe-area-inset-bottom))]` para o BottomNav não cobrir conteúdo em iPhones com notch.
- Header: badges/nome do usuário com `truncate` + `min-w-0`.

### Etapa 3 — Componentes compartilhados

- `Badge` (shadcn): variante `wrap` com `whitespace-normal break-words max-w-full` — usada em tags, segmentos e nomes de grupo.
- `Card`: adicionar `min-w-0` como default nos `CardContent` que fazem flex.
- `TabsList`: wrapper responsivo `.hscroll` reutilizável.

### Etapa 4 — Verificação (não-negociável)

Rodar Playwright em três larguras representativas — **360px (iPhone SE), 390px (iPhone 14), 768px (tablet)** — nas 5 páginas das capturas + `/perfil`, `/membros`, `/ranking`, `/encontros`, `/`. Para cada uma:

1. Screenshot da página inteira.
2. Verificação programática: `document.documentElement.scrollWidth === document.documentElement.clientWidth` (zero overflow horizontal).
3. Verificação de elementos-chave visíveis (botão "Confirmado", "Baixar cartão", último card do grid).

Comparar antes/depois e anexar as capturas na resposta final.

### Etapa 5 — Registro

Salvar memória `mem://design/responsive-rules` com as regras (remover `overflow-x-hidden` global, sempre `min-w-0` em flex, `.text-wrap-anywhere` para strings de usuário, breakpoint `xs`) para não regredir em telas futuras.

---

### Fora do escopo (para manter foco)

- Redesenho visual, mudança de paleta ou tipografia.
- Refatoração de hooks/lógica de negócio.
- Alterações em edge functions, RLS ou schema.

### Detalhes técnicos

- **Arquivos tocados:** `src/App.css`, `src/index.css`, `tailwind.config.ts`, `src/components/layout/{MainLayout,Header,BottomNav}.tsx`, `src/components/ui/badge.tsx`, `src/components/DigitalMemberCard.tsx`, `src/pages/{Index,Profile,Membros,Ranking,Encontros}.tsx`, e sweep leve em Feed/Indicações/Negócios/Aniversários para o mesmo padrão.
- **Sem alteração** de rotas, tipos Supabase ou lógica de estado.
- **Validação automatizada** com Playwright headless em 360/390/768px antes de dar como concluído.

**IMPORTANTE: não esqueça de criar a documentação e o changelog para tudo o que for feito. Isso é crucial em cada passo dado com a plataforma para termos consistência!**