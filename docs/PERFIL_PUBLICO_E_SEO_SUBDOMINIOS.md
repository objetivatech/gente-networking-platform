# Página pública do membro e rastreio dos subdomínios no Google

> Versão v3.41.0 — © Ranktop / Gente Networking

## 1. Página pública do membro (`/m/:slug`)

### Estrutura
| Bloco | Origem dos dados |
| --- | --- |
| Cabeçalho fixo (logo + CTA "Quero participar") | estático |
| Card do perfil (capa, foto, nome, rank, cargo•empresa, segmento, grupo, redes, "Conectar agora") | RPC `get_public_profile` |
| Faixa de KPIs (Presenças, Gente em Ação, Depoimentos, Indicações, Em negócios) | RPC `get_public_profile_stats` |
| Sobre o especialista (bio + "O que eu faço" + "Cliente ideal") | RPC `get_public_profile` |
| Cases de sucesso (carrossel de 4 passos) | RPC `get_public_profile_cases` |
| Atividades recentes (timeline, sem links) | RPC `get_public_profile_activity` |
| Como me indicar (card navy) | RPC `get_public_profile` |
| CTA lateral + banner final + CTA fixo no mobile | estático → `/auth?tab=signup` |

### Legibilidade
- Bio limitada a `max-w-prose` com `leading-relaxed` e espaçamento entre parágrafos.
- "O que eu faço", "Cliente ideal" e "Como me indicar" usam o componente interno `ExpandableRich`: acima de ~320 caracteres o texto é recolhido em 6 linhas com botão "Ver mais"/"Ver menos".
- Todos os blocos usam `min-w-0` e `text-wrap-anywhere`, conforme as regras de responsividade do projeto.

### Atividades recentes
- RPC `public.get_public_profile_activity(_slug text)` — `SECURITY DEFINER`, `EXECUTE` para `anon` e `authenticated`.
- Retorna no máximo 8 registros do `activity_feed` do membro, apenas dos tipos: `attendance`, `gente_em_acao`, `referral`, `testimonial`, `business_deal`, `business_case`, `matchmaking`.
- Exige `is_active = true` e `public_profile_enabled = true`.
- O front exibe um rótulo padronizado por tipo (não a descrição interna) e nenhum item é clicável — o feed continua sendo interno.

### O que não mudou
SEO/Helmet, schema.org (`ProfilePage` + `Person` + `BreadcrumbList`), gating de publicação por completude do perfil, cartão digital com QR, `scripts/generate-sitemap.ts` e a Pages Function `functions/m/[slug].ts`.

## 2. Rastreio dos subdomínios nas ferramentas do Google

Os dois projetos vivem em subdomínios da mesma marca:
- `https://lps.gentenetworking.com.br` (projeto "LPs Gente")
- `https://comunidade.gentenetworking.com.br` (este projeto)

### Google Search Console
1. Criar uma **propriedade de Domínio**: `gentenetworking.com.br` (não `https://...`).
2. Verificar com o **registro TXT** informado pelo Google no DNS do domínio.
3. Essa propriedade cobre automaticamente o domínio raiz e **todos** os subdomínios — os relatórios ficam consolidados sob a marca.
4. Opcional: manter propriedades de prefixo (`https://comunidade...`, `https://lps...`) para relatórios separados. As duas formas convivem sem conflito.
5. Enviar os sitemaps de cada subdomínio dentro da propriedade de Domínio:
   - `https://comunidade.gentenetworking.com.br/sitemap.xml`
   - `https://lps.gentenetworking.com.br/sitemap.xml`

### Google Analytics 4
- Usar **uma única propriedade GA4** com o **mesmo ID de medição** nos três sites.
- Como são subdomínios do mesmo domínio, o cookie `_ga` já é compartilhado: a sessão não quebra ao navegar entre eles e não é necessária configuração de "domínios cruzados" (essa opção é para domínios diferentes).
- Adicionar `comunidade.gentenetworking.com.br` e `lps.gentenetworking.com.br` na lista de domínios do stream de dados.
- Para ler separadamente: criar exploração/segmento por dimensão **Nome do host**, em vez de propriedades distintas.

### Sitemap, robots e llms
Cada subdomínio precisa dos seus próprios arquivos — não é possível compartilhar entre hosts.

Neste projeto:
- `public/sitemap.xml` é gerado por `scripts/generate-sitemap.ts` nos hooks `predev`/`prebuild`, com as rotas públicas estáticas + `/m/{slug}` de todos os perfis publicados (RPC `get_public_profile_slugs`).
- Sem a chave anon disponível no build, o gerador degrada para somente as rotas estáticas. Garanta `VITE_SUPABASE_PUBLISHABLE_KEY` nas variáveis de build do Cloudflare Pages para o sitemap sair completo.
- `public/robots.txt` já aponta o `Sitemap:` do subdomínio.
- `public/llms.txt` descreve a marca, as páginas públicas e a seção de perfis `/m/{slug}`.

No projeto "LPs Gente" o mesmo trio (`sitemap.xml`, `robots.txt`, `llms.txt`) deve existir apontando para `https://lps.gentenetworking.com.br`.
