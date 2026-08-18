# Nova página pública do membro (v3.41.0) + rastreio Google dos subdomínios

Direção escolhida: **Executivo** — cabeçalho compacto, faixa de KPIs, coluna principal (sobre + cases) e coluna lateral (atividades + CTA).

## Parte 1 — Redesign da página `/m/:slug`

### Estrutura nova
```text
[ header navy com logo + botão "Quero participar" ]
[ card de perfil: capa navy, foto, nome, rank, cargo•empresa, chips (segmento, grupo), redes + CTA laranja ]
[ faixa de 5 KPIs: Presenças | Gente em Ação | Depoimentos | Indicações | Negócios (destaque) ]
[ 2 colunas ]
  esquerda:  Sobre o Especialista (bio) + 2 caixas (O que eu faço | Cliente Ideal)
             Cases de Sucesso (card em destaque + navegação do carrossel)
  direita:   Atividades Recentes (timeline, sem links)
             Card CTA navy "Faça parte do Gente"
[ rodapé navy com logo Gente Networking ]
```

### Legibilidade (o problema do "texto amontoado")
- Bio e blocos ricos ganham largura de leitura controlada, `leading-relaxed` e espaçamento entre parágrafos.
- "O que eu faço", "Cliente Ideal" e "Como me indicar" passam a ter recolhimento ("Ver mais") quando o texto for longo, em vez de colunas altíssimas desalinhadas.
- Cases: cartão em destaque com Problema/Sucesso em duas colunas e Cliente/Solução expansíveis — sem paredão de 4 blocos empilhados.
- Cartões de altura equalizada; nada de coluna de 1.000px ao lado de coluna de 200px.

### Conversão
- CTA laranja "Quero participar" fixo no topo + CTA no cabeçalho do perfil + card CTA lateral + banner final.
- CTA sticky no rodapé em mobile.
- Todos apontam para `/auth?tab=signup`.

### Atividades do membro (novo)
- Nova RPC `get_public_profile_activity(_slug text)` (SECURITY DEFINER, acesso anônimo) devolvendo as ~8 atividades mais recentes do `activity_feed` do membro, **somente** de tipos seguros para o público (presença, Gente em Ação, indicação, depoimento, negócio, case) — sem descrições internas, sem valores de terceiros, sem IDs de referência.
- Componente novo `src/components/public/PublicProfileActivity.tsx` renderiza a timeline. Nada é clicável.
- Só aparece se houver atividades; some silenciosamente caso contrário.

### O que não muda
SEO/Helmet, schema.org, RPC `get_public_profile`, gating de publicação, cartão digital, sitemap e a Pages Function `functions/m/[slug].ts` continuam funcionando como hoje.

## Parte 2 — Google Search Console, Analytics, sitemap e llms

Sim, dá para manter tudo conectado à marca Gente Networking.

**Search Console** — adicionar uma **propriedade de Domínio** `gentenetworking.com.br` (verificação por registro TXT no DNS). Ela cobre o domínio raiz e **todos** os subdomínios (`lps.`, `comunidade.`) em um só relatório de marca. Opcionalmente, manter também propriedades de prefixo por subdomínio quando quiser relatórios separados — as duas coisas convivem.

**Analytics (GA4)** — uma única propriedade GA4 com o **mesmo ID de medição** nos três sites. Como são subdomínios do mesmo domínio, o cookie já é compartilhado e a sessão não quebra ao navegar entre eles; basta adicionar `comunidade.gentenetworking.com.br` e `lps...` na lista de domínios de dados do stream. Para separar leitura, usar exploração/segmento por hostname (não criar propriedades diferentes).

**Sitemap e llms.txt** — cada subdomínio precisa dos seus próprios arquivos; não é possível compartilhar. Neste projeto já existem `public/sitemap.xml` (gerado por `scripts/generate-sitemap.ts` com as rotas públicas + `/m/{slug}`), `public/robots.txt` e `public/llms.txt`. Ações deste plano:
- Atualizar `public/llms.txt` incluindo a seção de perfis públicos `/m/{slug}` e a referência do sitemap.
- Confirmar que a chave anon está disponível no build do Cloudflare Pages para o sitemap sair completo (hoje ele degrada para só rotas estáticas sem a chave).
- Enviar `https://comunidade.gentenetworking.com.br/sitemap.xml` no Search Console (a propriedade de Domínio aceita sitemaps de qualquer subdomínio). O mesmo deve ser feito no projeto "LPs Gente" para o sitemap dele.

Observação honesta: a verificação da propriedade de Domínio e o envio dos sitemaps são feitos por você no Google (ou eu posso executar via conector do Search Console, se você conectar a conta). Eu cuido do que é código.

## Detalhes técnicos
- Arquivos: `src/pages/PublicProfile.tsx` (reescrita da apresentação), novo `src/components/public/PublicProfileActivity.tsx`, ajustes em `PublicProfileStats.tsx` e `PublicProfileCases.tsx` para o novo visual, `public/llms.txt`.
- Migração: criação da RPC `get_public_profile_activity` com `GRANT EXECUTE` para `anon` e `authenticated`; filtro por `public_profile_enabled = true`.
- Tokens: navy `#1E3A5F`, laranja `#F7941D`, fundo `#f0f4f8`, cards brancos com borda `slate-200` e raio 2xl — mesmos valores do protótipo aprovado.
- Responsividade conforme as regras do projeto (`min-w-0`, `text-wrap-anywhere`, sem `overflow-x:hidden` global).
- Documentação: `docs/TECHNICAL_DOCUMENTATION.md` + nova entrada no changelog **v3.41.0**.
