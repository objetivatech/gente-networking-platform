## Objetivo

Restaurar os logos corretos nos pontos indicados, ajustar o Cartão Digital (dois logos + quebra de linha automática) e corrigir o erro na página pública do perfil (`/m/:slug`).

## Escopo — apenas frontend/apresentação e assets. Nenhuma alteração em DB, RPC, edge functions, permissões ou lógica de negócio.

### 1) Substituir arquivos de logo em `public/`

Sobrescrever as versões brancas com as imagens em anexo (garantindo consistência visual):

- `public/logo-gente-comunidade-branco.png` ← `user-uploads://gente-comunidade_Editado.png`
- `public/logo-gente-networking-branco.png` ← `user-uploads://gente-networking_Editado.png`

Manter intactos: `logo-gente.png`, `logo-gente-comunidade.png`, `logo-gente-networking.png`, `logo-gente-card.png` (usados em emails, PWA, favicons, etc.).

### 2) Apontar componentes para as versões brancas nos fundos escuros

- `**src/pages/Auth.tsx**` (linha 39): `logoGente` → `/logo-gente-comunidade-branco.png`. O logo aparece dentro de um card navy no formulário de login.
- `**src/components/layout/Sidebar.tsx**` (linha 21): `logoGente` → `/logo-gente-comunidade-branco.png`. Topo da sidebar tem fundo navy.
- `**src/components/layout/Footer.tsx**` (linha 11): `logoComunidade` → `/logo-gente-comunidade-branco.png`. Rodapé é navy.

Não alterar: `AuthConfirm`, `ConvitePublico`, `GuestWelcome`, `Instalar`, `RedefinirSenha`, `PublicProfile` — continuam com `/logo-gente-networking.png` (essas páginas são externas/públicas com identidade Networking). - **IMPORTANTE: Se nessas páginas o local onde o logo fica tiver a cor azul escura de fundo, substituir pelo logo gente networking branco que está em anexo.**

### 3) Cartão Digital do Membro (`src/components/DigitalMemberCard.tsx`)

Restabelecer configuração dos dois logos e resolver sobreposição de texto/QR.

**Logos no canvas:**

- Trocar `LOGO_COMUNIDADE_SRC` → `/logo-gente-comunidade-branco.png` (destaque, canto superior esquerdo, tamanho atual `logoH=100`).
- Trocar `LOGO_NETWORKING_SRC` → `/logo-gente-networking-branco.png` (secundário, canto superior direito, menor). Remover o `globalAlpha = 0.55` que o deixa quase invisível — usar opacidade cheia (o branco já garante o efeito discreto sobre o navy). Ajustar `nH` para ~40 para manter proporção menor que o principal.

**Quebra de linha automática (sem reduzir fonte):**

- Introduzir helper `wrapText(ctx, text, x, y, maxWidth, lineHeight)` que quebra por palavras e retorna a próxima coordenada Y.
- Definir uma largura útil à esquerda do QR: `TEXT_MAX_WIDTH = qrX - 14 - 60 - 20` (≈ 596 px com layout atual). Aplicar em:
  - **Nome** (fonte 46, lineHeight 52) — começa em y=200 para acomodar até 2 linhas antes do bloco de cargo.
  - **Cargo/empresa** (fonte 26, lineHeight 32).
  - **Segmento** (fonte 22, lineHeight 28).
  - **Email/telefone** (fonte 24, lineHeight 30) — normalmente já cabem, mas passar pelo mesmo wrapper.
- Reorganizar Ys para serem calculados dinamicamente a partir do Y retornado por cada `wrapText`, evitando colisões e mantendo o QR na posição atual (canto inferior direito).
- Se o total exceder a altura do card, ampliar `H` de 560 para 620 (mudança pontual, sem quebrar layout responsivo pois o canvas usa `w-full h-auto`).

### 4) Página pública `/m/:slug` — erro "Algo deu errado"

- Investigação inicial: a RPC `get_public_profile` responde `[]` para slugs inexistentes/não publicados (verificado), o que deveria acionar o estado "Perfil não disponível" e **não** o ErrorBoundary. O erro atual vem de uma exceção durante render/efeito.
- Ações corretivas em `src/pages/PublicProfile.tsx` (sem tocar em RPC/RLS):
  1. Tratar erro da RPC explicitamente: desestruturar `{ data, error }`, logar `error`, e cair no estado "Perfil não disponível" em vez de propagar.
  2. Guardar acesso seguro: `Array.isArray(data) ? data[0] : null`.
  3. Envolver a montagem de `jsonLd`/`breadcrumb` em try/catch defensivo — se algum campo vier em formato inesperado, cair para SEO mínimo (title + noindex) em vez de estourar.
  4. Renderizar `<ProfileSEO>` também durante `loading` (com título neutro) para evitar remontagem do Helmet no ciclo de vida.
- Após deploy, revalidar com o slug real do usuário (`/m/diogo-devitte-membro-...`). Se ainda houver erro, capturar o stack via console para segundo ciclo — mas as guardas acima já cobrem os cenários prováveis (RPC error, `data` não-array, campos nulos em JSON-LD).

### 5) Documentação e Changelog

- Nova entrada `v3.29.0 — Ajustes de identidade visual e correção do perfil público` em:
  - `mem://features/v3290-logos-cartao-perfil-publico.md` (memória).
  - Inserir no `system_changelog` do Supabase via migração SQL simples (padrão dos itens anteriores).
- Atualizar `docs/UI_UX_GUIDELINES.md` com a regra: **logos brancos são obrigatórios em superfícies navy** (Auth, Sidebar, Footer, Cartão) e logos coloridos em superfícies claras/emails.

## Detalhes técnicos

- Nenhuma dependência nova.
- Substituição dos PNGs via `cp /mnt/user-uploads/... public/...` (arquivos são de projeto, mantidos no repo como as demais logos já estão).
- Cartão continua PNG 1000×(560→620), download via `canvas.toDataURL`.
- `wrapText` respeita palavras isoladas maiores que a largura (força quebra por caractere como fallback).

## Fora de escopo

- Alterar RPC `get_public_profile`, RLS, colunas de perfil, edge functions ou fluxo de publicação.
- Alterar logos em emails, PWA icons, favicon, ou páginas externas (Convite, GuestWelcome, RedefinirSenha, AuthConfirm, Instalar).