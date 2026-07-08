---
name: SEO páginas públicas de perfil v3.21.0
description: Página pública do membro em /m/:slug, SEO/schema via Helmet, OG=foto do perfil, meta no edge (CF Pages Function), sitemap dinâmico
type: feature
---
# v3.21.0 — SEO das páginas públicas de perfil

## URL
- Página pública do perfil agora em **`/m/:slug`** (slug amigável já gerado do nome).
- `/p/:slug` mantido como **redirect** (`<Navigate replace>`) para `/m/:slug` (compat).
- Rota interna logada `/membro/:slug` (MemberProfile) permanece intacta.
- Pontos que geram o link público atualizados para `/m/`: `PublicProfilePublishControl.tsx`, `DigitalMemberCard.tsx` (QR Code).

## SEO client-side (PublicProfile.tsx)
- `<Helmet>` (react-helmet-async): title `Nome — Cargo na Empresa | Gente Networking`, description (bio/what_i_do truncada ~155), canonical + og:url auto-referentes.
- **og:image / twitter:image = avatar_url (foto do perfil)**; fallback logo Networking.
- og:type=profile, twitter:card=summary_large_image.
- Perfil inexistente/não publicado → `noindex, follow`.
- JSON-LD: `ProfilePage` com `Person` (jobTitle, worksFor, image, sameAs=[linkedin,instagram,website]) + `BreadcrumbList`.

## Meta no edge (crawlers sem JS)
- `functions/m/[slug].ts` — Cloudflare Pages Function com HTMLRewriter: remove tags estáticas (title, description, canonical, og:*, twitter:*) e injeta as do perfil, buscando dados via RPC `get_public_profile`.
- Requer env no CF Pages (runtime, sem VITE_): `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Documentado em `docs/CLOUDFLARE_ENV_SETUP.md`.

## Sitemap
- `scripts/generate-sitemap.ts` (hooks `predev`/`prebuild`) gera `public/sitemap.xml` com rotas estáticas + `/m/{slug}` dos perfis publicados via RPC `get_public_profile_slugs()` (SECURITY DEFINER, anon). Falha graciosa (só estáticas) se sem chave.
