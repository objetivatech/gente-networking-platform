---
name: v3.29.0 — Logos brancos, cartão digital e perfil público
description: Ajustes de identidade visual (logos brancos em superfícies navy), dois logos no cartão digital com quebra de linha automática, e hardening do carregamento do perfil público /m/:slug
type: feature
---
# v3.29.0

## Logos brancos em superfícies navy
- `public/logo-gente-comunidade-branco.png` e `public/logo-gente-networking-branco.png` substituídos pelas versões enviadas pelo usuário.
- Auth (`src/pages/Auth.tsx`), Sidebar (`src/components/layout/Sidebar.tsx`) e Footer (`src/components/layout/Footer.tsx`) agora usam `logo-gente-comunidade-branco.png`.
- Páginas externas com logo sobre fundo `bg-primary` (navy) — `AuthConfirm`, `ConvitePublico`, `GuestWelcome`, `Instalar`, `RedefinirSenha`, `PublicProfile` — agora usam `logo-gente-networking-branco.png`.
- Não alterados: PWA icons, favicon, `logo-gente-card.png`, emails.

## Cartão Digital (`src/components/DigitalMemberCard.tsx`)
- Dois logos brancos: Comunidade (destaque, canto superior esquerdo, h=100) + Networking (secundário, canto superior direito, h=56, sem globalAlpha).
- Helper `wrapText(ctx, text, x, y, maxWidth, lineHeight)` — quebra por palavra; palavras muito longas caem no fallback por caractere. Aplicado a nome, cargo/empresa, segmento, email e telefone.
- Largura útil calculada como `qrX - 60 - 20` para nunca invadir o QR.
- Altura do canvas ampliada de 560 para 620 para acomodar até 2 linhas de nome + cargo longo. Ys são calculados dinamicamente a partir do retorno de `wrapText`.

## Perfil público (`src/pages/PublicProfile.tsx`)
- `useEffect` agora trata `error` da RPC `get_public_profile`, valida `Array.isArray(data)` e usa try/catch, evitando propagar exceção para o `ErrorBoundary` (que exibia "Algo deu errado").
- `JSON.stringify` do JSON-LD envolvido em try/catch defensivo.
- `<ProfileSEO>` renderizado também durante `loading` (com título neutro) para evitar remontagem do Helmet.
