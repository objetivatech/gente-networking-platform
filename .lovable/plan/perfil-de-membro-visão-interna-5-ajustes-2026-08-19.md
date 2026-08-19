# Perfil de membro (visão interna) — 5 ajustes

Escopo: `/membro/:slug` (visualização entre membros), com reflexos em `/m/:slug` (página pública) e no acesso sem login.

## 1. Botão de compartilhar mais claro e visível
- Trocar o botão discreto "Compartilhar" (outline) por um botão em destaque laranja da marca (#F7941D), com texto explícito: **"Compartilhar perfil público"**.
- O link compartilhado passa a ser a URL pública `https://comunidade.gentenetworking.com.br/m/<slug>` — hoje ele copia a URL interna `/membro/...`, que exige login (causa raiz do item 3).
- Em telas pequenas o botão ocupa a largura disponível e o texto encurta para "Compartilhar perfil".

## 2. Botão condicional à existência da página pública
- Usar as regras já existentes de completude (`src/lib/profile-completeness.ts`) + o campo `public_profile_enabled` do perfil.
- **Se publicado:** exibe "Compartilhar perfil público".
- **Se não publicado/incompleto:** exibe "Pedir para completar o perfil", que abre um diálogo curto (mensagem opcional) e envia um aviso ao membro por e-mail e notificação, listando os campos que faltam. Mensagem no tom de cuidado entre membros ("Fulano quer indicar você e precisa da sua página completa").
- No próprio perfil (membro vendo a si mesmo) o botão vira "Publicar minha página" e leva a Meu Perfil.
- Envio reaproveita a edge function `send-notification` com um novo tipo `profile_completion_request`, respeitando as preferências de e-mail do destinatário; sem pontuação e sem novas tabelas.

## 3. Links de página pública e redirecionamento
- `/membro/:slug` sem login hoje cai em `/auth` (aba Entrar). Passa a redirecionar para `/m/:slug` (página pública), preservando o slug.
- Se a página pública não existir/estiver despublicada, a tela pública já mostra o aviso "Perfil não disponível" com CTA de cadastro; os CTAs passam a apontar sempre para `/auth?tab=signup`.
- Corrigir também os pontos que ainda geram link interno para compartilhamento externo (perfil e cartão digital), padronizando em `/m/:slug`.

## 4. Aba "Sobre" mostrando HTML cru
- Os blocos "O que eu faço", "Cliente Ideal" e "Como me indicar" são renderizados como texto puro dentro de `<p>`, exibindo as tags. Passam a usar o componente `RichText` (HTML já sanitizado), como no restante do sistema.
- Ajustar espaçamento/quebra de linha nos cards (`min-w-0`, `text-wrap-anywhere`) para textos longos.

## 5. Foto sobrepondo o selo de pontuação
- Reorganizar o cabeçalho do card: avatar posicionado acima da coluna do selo, sem sobreposição — em desktop, coluna dedicada (avatar + selo de rank + pontos empilhados); em mobile, avatar centralizado com selo e pontos abaixo.
- Selo de rank deixa de ficar por trás da foto e o texto do rank fica totalmente legível.

## Responsividade
Todas as mudanças seguem as regras já registradas: sem `overflow-x:hidden` global, `min-w-0` em flex, `.text-wrap-anywhere` para strings longas e botões que empilham abaixo de `sm`.

## Técnico
- Arquivos: `src/pages/MemberProfile.tsx` (layout, RichText, botões), novo `src/components/ShareOrNudgeProfile.tsx`, `src/App.tsx` / `src/components/layout/MainLayout.tsx` (redirecionamento sem login), `supabase/functions/send-notification/index.ts` (novo tipo de aviso), `src/components/DigitalMemberCard.tsx` (link público).
- Sem alteração de schema, RLS ou regras de pontuação.
- Documentação: atualizar `docs/PERFIL_PUBLICO_E_SEO_SUBDOMINIOS.md` e `docs/UI_UX_GUIDELINES.md`; nova entrada de changelog **v3.42.0** e atualização da memória do projeto.
