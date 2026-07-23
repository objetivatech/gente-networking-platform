## Objetivo

Reforçar a hierarquia de marca (Gente Networking = negócio, Gente Comunidade = produto) na tela de login e manter as páginas legais dentro do ambiente autenticado da plataforma, além de confirmar o logo em uso nos e-mails.

## 1) E-mails — confirmação

Verificado: `supabase/functions/_shared/email-templates.ts` já usa `/logo-gente-networking.png` (linha 6, `LOGO_URL`). Todos os templates (magic link, reset, confirmação, convite) herdam essa constante. **Nenhuma mudança necessária** — apenas registrar a confirmação na resposta ao usuário.

## 2) Tela de login (`src/pages/Auth.tsx`)

- Linha 39: `const logoGente = '/logo-gente-networking.png';` (troca do branco de Comunidade para o de Networking).
- Linha 289: `alt="Gente Networking"` (já está correto, manter).
- Linha 294: trocar `<CardTitle>Gente Networking</CardTitle>` por `<CardTitle>Gente Comunidade</CardTitle>`.
- Linha 296: manter subtítulo "Conectando pessoas, gerando negócios".
- Linha 281 (SEO description): sem alteração — segue mencionando Gente Networking como marca.

O card de fundo navy do formulário continua com logo branco (agora o de Networking), coerente com o branding do negócio.

## 3) Páginas legais dentro da plataforma

Hoje `/termos-de-uso`, `/politica-de-privacidade` e `/politica-de-cookies` estão registradas em `src/App.tsx` (linhas 120–122) **fora** do `<Route element={<MainLayout />}>` (linha 123), então abrem em tela cheia sem Sidebar/Header/Footer.

Ação:

- Mover essas três rotas para dentro do bloco `MainLayout`, ao lado de `/documentacao` (linha 146). Assim herdam o layout autenticado (Sidebar + Header + Footer), igual a `Documentacao.tsx`.
- Ajustar os três componentes em `src/pages/legal/` para remover o wrapper `<main className="min-h-screen bg-background">` (o `MainLayout` já provê container e background) e manter apenas o `<article>` com o conteúdo. `Helmet` permanece.
- Manter os links no `Footer.tsx` e no `LgpdBanner.tsx` — continuam funcionando, agora dentro da moldura da plataforma.

Observação de acesso: as rotas passam a exigir autenticação (padrão do `MainLayout` via `AuthContext`). Se o requisito for permitir consulta pública dessas políticas (usuário deslogado clicando no link do banner LGPD antes de logar), o correto seria manter a rota pública mas embrulhar num layout leve. **Preciso confirmar com você antes de implementar** (ver Pergunta abaixo).

## 4) Documentação e changelog

- `docs/UI_UX_GUIDELINES.md`: registrar que **Gente Networking é a marca do negócio** (usada em e-mails, login, páginas externas/públicas) e **Gente Comunidade é o produto** (nome exibido como título dentro do app, sidebar, cartão do membro etc.).
- Nova entrada `v3.30.0 — Hierarquia de marca (Networking/Comunidade) e páginas legais no layout` em `system_changelog` (migration curta) e memória `mem://features/v3300-branding-hierarquia-legal-layout.md`.

## Fora de escopo

- Sidebar/Footer/Cartão Digital continuam com o logo de **Gente Comunidade branco** (é onde o produto se apresenta).
- Nenhuma mudança em RPC, RLS, edge functions, permissões ou lógica de negócio.

## Pergunta antes de implementar

As páginas legais devem ser acessíveis **também por usuários deslogados** (pelo link do banner LGPD na tela de login)? Se sim, mantenho rota pública com um layout enxuto (Header simples + Footer, sem Sidebar). Se não, movo direto para dentro do `MainLayout` autenticado.

**As páginas legais devem estar dsponiveis apenas para usuários logados.**