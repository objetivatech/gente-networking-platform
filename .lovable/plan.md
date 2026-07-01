
# Ajustes e novos recursos — v3.19.0

Quatro frentes: logo no cartão, Health Score, notificações do Feed/email e página pública de perfil.

## 1. Logo do Gente no cartão do membro

- Em `src/components/DigitalMemberCard.tsx`, trocar o texto "GENTE / NETWORKING" desenhado no `<canvas>` pelo logotipo real.
- Usar `logo-gente-branco.png` (versão branca já existente em `public/`), carregando a imagem e desenhando-a no canto superior esquerdo, mantendo proporção sobre o fundo navy.
- Fallback: se a imagem falhar ao carregar, manter o texto atual (o cartão continua válido).

## 2. Health Score — como funciona e por que está vazio

**Como é gerado (documentação para você entender e depois documentar):**
O `MemberHealthScoreCard` chama a RPC `get_members_health_scores(_days)` (SECURITY DEFINER, só admin). Ela soma, nos últimos N dias, sinais de engajamento por membro com pesos: reunião (Gente em Ação) ×15, indicação ×15, presença ×20, depoimento ×10, resposta no Conselho ×5, business case ×10 — limitado a 100. Classifica em `saudável` (≥70), `atenção` (≥30), `risco` (<30). É métrica de retenção e **não** afeta o ranking.

**Diagnóstico do bloco vazio:** existem 24 membros ativos que deveriam aparecer, então o problema é de execução, não de dados. Na fase de build vou:
- Reproduzir a chamada da RPC autenticado como admin (Playwright/logado) e capturar o erro real (provável exceção não tratada engolida pelo react-query, deixando o estado "Nenhum membro encontrado").
- Corrigir a causa (ex.: tratamento de erro/`enabled`, ou ajuste na RPC) e exibir mensagem de erro explícita no card em vez de estado vazio silencioso.
- Adicionar tooltip/legenda no card explicando os pesos e o período.

## 3. Revisão de notificações (Feed + email)

**Auditoria:** hoje o Feed é alimentado via `add_activity_feed`/triggers e os emails via edge function `send-notification` (depoimento, indicação, convite, boas-vindas, conselho, reunião, mudança de rank). **Pedido de Indicação** (`referral_requests`) não gera nada no Feed nem email.

**Implementação (Item principal):**
- Migração: trigger `AFTER INSERT` em `referral_requests` que:
  1. Chama `add_activity_feed` (tipo `referral_request`) para registrar o pedido no Feed, com `team_id` do grupo do autor.
  2. Marca o registro para notificar o grupo.
- Envio de email a **todos os membros do mesmo grupo** do autor: nova branch `referral_request` na edge function `send-notification` (novo template em `_shared/email-templates.ts`), respeitando `email_notifications_enabled`. O disparo será feito no `createRequest` do hook `useReferralRequests.ts` (buscando os membros do grupo via RPC) — mesmo padrão já usado em `useReferrals`/`useCouncil`.
- Adicionar renderização do novo `activity_type` no `ActivityFeed.tsx` (ícone/label).
- Entregável extra: documentar em `docs/` a matriz "evento → Feed? → email? → destinatários" para referência.

## 4. Página pública de perfil com controle de publicação

**Nova rota pública** `/p/:slug` (fora do `MainLayout`, sem autenticação), com cabeçalho e rodapé de identidade Gente (logo, navy/laranja):
- Exibe dados do perfil (avatar, nome, cargo/empresa, segmento, bio, "o que faço", cliente ideal, como me indicar, links sociais).
- CTA de inscrição direcionando para o formulário existente: `/auth?tab=signup` (vou adicionar suporte ao query param `tab` no `Auth.tsx` para abrir direto na aba Cadastrar).
- SEO por rota (title/description/og) via Helmet.

**Controle de publicação (membros e convidados):**
- Migração: coluna `public_profile_enabled boolean default false` em `profiles`.
- Regra de completude: só pode publicar quando os campos obrigatórios estiverem preenchidos — avatar, nome, cargo, empresa, segmento, bio, "o que faço", cliente ideal, como me indicar (lista final confirmada no build).
- Acesso anônimo seguro: a página pública lê os dados via RPC `SECURITY DEFINER` `get_public_profile(_slug)` que retorna **apenas** campos públicos e somente se `public_profile_enabled = true` (não expõe email/telefone a menos que o membro opte por exibir contato — decidir no build; por padrão ocultar dados sensíveis). Sem afrouxar RLS da tabela base.

**UX no `Profile.tsx`:**
- Toggle "Publicar página pública" desabilitado enquanto houver campos faltando.
- Tooltips de aviso indicando exatamente quais campos ainda faltam preencher.
- Botão "Copiar link público" quando publicado.

**Cartão + QR (integração com Item 1):**
- O QR do `DigitalMemberCard` passa a apontar para `/p/:slug` (página pública) em vez de `/membro/:slug` (interna).
- O cartão **só é gerado** após o perfil estar completo e publicado; caso contrário, exibir aviso com a lista de pendências (mesmos tooltips).

## Documentação e changelog
- Nova entrada de changelog **v3.19.0** em `system_changelog`.
- Atualizar `docs/TECHNICAL_DOCUMENTATION.md` e `docs/USER_FLOWS.md`.
- Novas memórias: `mem://features/public-profile-page`, atualização de `matchmaking`/notificações, e `mem://index.md`.
- Testes de regressão para novas regras de acesso/completo em `access-control` quando aplicável.

## Detalhes técnicos (resumo)
- Migrações: coluna `public_profile_enabled`; trigger de Feed em `referral_requests`; RPC `get_public_profile`; possível ajuste em `get_members_health_scores`.
- Edge function `send-notification`: novo tipo `referral_request` + template.
- Frontend: `DigitalMemberCard.tsx`, `ActivityFeed.tsx`, `Profile.tsx`, `Auth.tsx`, nova página `PublicProfile.tsx` + rota em `App.tsx`, hook `useReferralRequests.ts`.
- Sem quebrar recursos existentes; validação com `tsgo` e `bun run test`.
