---
name: Regras de responsividade (v3.22.0)
description: Padrões obrigatórios para evitar overflow horizontal e cortes visuais no mobile
type: design
---

# Regras de Responsividade — mobile-first

## Proibido (mascara o problema)
- `overflow-x: hidden` em `html`, `body`, `#root` ou `<main>`. Já foi removido em `src/App.css`, `src/index.css` e `MainLayout.tsx`.

## Obrigatório
1. **`min-w-0` em containers flex.** Qualquer elemento com `flex-1` cujo conteúdo pode ser longo (texto, e-mail, empresa) precisa de `min-w-0` no pai flex e no filho — Tailwind herda `min-width: auto` e estoura.
2. **Strings de usuário → `text-wrap-anywhere`** (utilitário em `src/index.css`). Use em bio, e-mail, telefone, empresa, links, tags, segmentos. Evite `break-all` (quebra em qualquer letra).
3. **Grids com breakpoint `xs` (380px)** para conteúdo denso (stats numéricos com prefixo `R$`).
4. **`TabsList` com muitos itens** → envolva em `<div className="hscroll -mx-1 px-1">` e adicione `w-max` à `TabsList` para rolagem horizontal controlada.
5. **`Badge` (shadcn)** já traz `whitespace-normal break-words max-w-full [overflow-wrap:anywhere]` por padrão — não sobrescreva com `whitespace-nowrap` a menos que seja um número pequeno (ex: "120 pts").
   - Badges de segmento/tipo de negócio devem ser tratadas como conteúdo longo: `h-auto`, `items-start`, `text-left`, `leading-snug` e `<span className="text-wrap-anywhere">` interno.
   - Badges curtas de status (`Frio`, `Morno`, `Quente`, `Membro`, `Externo`) podem usar `whitespace-nowrap`.
6. **Botões de ação em cards de lista** → `w-full sm:w-auto` ou empilhar o header do card com `flex-col sm:flex-row`.
7. **Canvas/imagens fixas (cartão digital)** → wrapper com `w-full max-w-full overflow-hidden`, canvas com `w-full h-auto`.
8. **Padding bottom do `<main>`** → `max(5rem, env(safe-area-inset-bottom) + 5rem)` para o `BottomNav` + iPhones com notch.
9. **Cards de lista em mobile** → separar cabeçalho/metadados do corpo. Nome/data/badge não devem disputar a mesma largura com descrição, observações, contato ou imagem.

## Validação
Antes de mergear alterações de UI, rodar Playwright em 360/390/768px e checar `document.documentElement.scrollWidth === clientWidth` (zero overflow horizontal) nas páginas afetadas.
