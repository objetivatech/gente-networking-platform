---
name: Perfil público redesenhado + SEO subdomínios v3.41.0
description: Novo layout executivo de /m/:slug com KPIs, timeline pública de atividades, textos recolhíveis e CTAs de conversão; orientação de Search Console/GA4 por subdomínio
type: feature
---
# v3.41.0 — Página pública do membro (conversão) e rastreio por subdomínio

## Layout (`src/pages/PublicProfile.tsx`)
- Cabeçalho fixo (logo Networking + "Quero participar"), card do perfil com capa/foto/rank/segmento/grupo/redes + botão "Conectar agora".
- Faixa de KPIs (`PublicProfileStats`): Presenças, Gente em Ação, Depoimentos, Indicações, Em negócios (último em navy).
- Grid 2 colunas: principal (Sobre o especialista + O que eu faço/Cliente ideal + Cases) e lateral (Atividades recentes, Como me indicar em card navy, CTA "Faça parte do Gente").
- `ExpandableRich`: textos > ~320 chars recolhem em 6 linhas com "Ver mais". Em tom escuro, links em laranja (#F7941D).
- CTA fixo no rodapé em mobile; banner final de conversão.

## Atividades públicas
- `PublicProfileActivity.tsx` + RPC `get_public_profile_activity` (SECURITY DEFINER, anon): até 8 itens, tipos seguros, rótulos padronizados, sem links internos.

## Cases (`PublicProfileCases.tsx`)
- Carrossel passa a exibir **1 case por vez** (coluna estreita); passos em 2 colunas; textos longos (>700 chars somados) recolhem em 5 linhas com "Ver case completo".

## SEO / analytics dos subdomínios
- Search Console: **propriedade de Domínio** `gentenetworking.com.br` (TXT no DNS) cobre `lps.` e `comunidade.`; enviar os dois sitemaps nela.
- GA4: uma única propriedade/ID nos três hosts; cookie compartilhado entre subdomínios (não é cross-domain); separar por dimensão "Nome do host".
- Cada subdomínio mantém seu `sitemap.xml`, `robots.txt` e `llms.txt`.
- Documentado em `docs/PERFIL_PUBLICO_E_SEO_SUBDOMINIOS.md`.
