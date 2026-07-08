# Páginas públicas de membros — SEO, Schema e OG

## Objetivo
Tornar as páginas públicas de perfil indexáveis pelo Google, com estrutura de SEO completa, dados estruturados (schema.org) e imagem OG usando a foto do perfil. Adotar URL amigável e curta `/m/[nome-do-membro]`.

## Decisões confirmadas
- URL pública passa a ser `https://comunidade.gentenetworking.com.br/m/[slug]` (o slug já é gerado a partir do nome, ex. `joao-silva`). A rota interna `/membro/:slug` (logado) permanece intacta.
- Previews sociais (WhatsApp/LinkedIn/Facebook) via **Cloudflare Pages Function** que injeta as meta tags no HTML no edge — funciona tanto para Google quanto para redes sociais.

---

## 1. Nova rota pública `/m/:slug`
- `src/App.tsx`: adicionar `<Route path="/m/:slug" element={<PublicProfile/>} />`.
- Manter `/p/:slug` como **redirect permanente** para `/m/:slug` (compatibilidade com links já compartilhados), usando `<Navigate>`.
- Atualizar todos os pontos que montam o link público para usar `/m/`:
  - `PublicProfilePublishControl.tsx` (`publicPath`, link "Copiar"/"Abrir").
  - `DigitalMemberCard.tsx` (QR Code aponta para a página pública).
  - Qualquer outro lugar que gere `/p/:slug`.

## 2. SEO client-side (Helmet) na `PublicProfile.tsx`
Adicionar `<Helmet>` preenchido com os dados do perfil (após carregar a RPC):
- `<title>`: `Nome — Cargo na Empresa | Gente Networking`.
- `<meta name="description">`: bio/what_i_do resumido (~155 chars).
- `<link rel="canonical">` e `og:url`: `https://comunidade.gentenetworking.com.br/m/{slug}` (auto-referência).
- `og:type=profile`, `og:title`, `og:description`.
- **`og:image` e `twitter:image` = `avatar_url`** do perfil (foto). Fallback: logo Gente Networking quando não houver foto.
- `twitter:card=summary_large_image`.
- Quando o perfil não existe / não publicado: `<meta name="robots" content="noindex">`.

## 3. Dados estruturados (schema.org)
JSON-LD via Helmet na `PublicProfile.tsx`:
- `@type: ProfilePage` contendo um `Person` (`name`, `jobTitle`=cargo, `worksFor`=empresa, `image`=avatar, `description`=bio, `sameAs`=[linkedin, instagram, website]).
- `BreadcrumbList` (Início → Membros → Nome).

## 4. Edge: meta tags para crawlers sem JS (Cloudflare Pages Function)
Como o app é SPA em Cloudflare Pages, crawlers sociais não executam JS. Criar uma **Pages Function** que intercepta `/m/*`:
- `functions/m/[slug].ts` (Cloudflare Pages Functions): busca o perfil chamando a RPC `get_public_profile` (via REST do Supabase, com anon key em variável de ambiente do Pages), pega o HTML base (`index.html`) e injeta/reescreve as meta tags (`title`, `description`, `og:*`, `twitter:*`, canonical, JSON-LD) com os dados reais antes de servir. Usar `HTMLRewriter` (nativo no CF).
- Se o perfil não existir/estiver despublicado, servir o HTML com `noindex` e título genérico.
- Requer configurar as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` no ambiente do Cloudflare Pages (documentar em `docs/CLOUDFLARE_ENV_SETUP.md`).

## 5. Indexação (sitemap + robots)
- `public/robots.txt`: já permite tudo; adicionar nada que bloqueie `/m/`.
- `public/sitemap.xml`: hoje é estático. Como os perfis públicos são dinâmicos, incluir as URLs `/m/{slug}` dos perfis com `public_profile_enabled = true`. Proposta: criar `scripts/generate-sitemap.ts` (hooks `predev`/`prebuild`) que consulta os slugs publicados via RPC e gera o sitemap com as rotas estáticas + `/m/{slug}`. (Confirma-se durante a implementação se prefere manter estático e adicionar só as rotas fixas.)

## 6. RPC
- `get_public_profile` já retorna os campos necessários (nome, avatar, cargo, empresa, bio, redes, slug, team_name). Nenhuma mudança de schema prevista. Se o sitemap dinâmico for adotado, adicionar uma RPC leve `get_public_profile_slugs()` (SECURITY DEFINER, anon) retornando apenas `slug` dos perfis publicados.

---

## Detalhes técnicos
- **Arquivos front**: `src/App.tsx`, `src/pages/PublicProfile.tsx`, `src/components/PublicProfilePublishControl.tsx`, `src/components/DigitalMemberCard.tsx`.
- **Edge**: `functions/m/[slug].ts` (Cloudflare Pages Function, `HTMLRewriter`).
- **Infra/docs**: `docs/CLOUDFLARE_ENV_SETUP.md` (novas env vars), possivelmente `scripts/generate-sitemap.ts` + `package.json` (predev/prebuild).
- **DB (opcional, sitemap dinâmico)**: migration com `get_public_profile_slugs()`.
- Todos os novos arquivos com o cabeçalho JSDoc de copyright Ranktop (padrão do projeto).
- Idioma PT-BR mantido; cores/branding Gente Networking (#1E3A5F / #F7941D).

## Fora de escopo
- Não altera a lógica de negócio de perfis nem o fluxo de publicação (gating de completude permanece).
- Não migra o mecanismo de deploy (CF Pages + GitHub) nem o Worker de proxy do Supabase.
