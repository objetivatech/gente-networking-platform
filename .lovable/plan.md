
# v3.28.0 — Revisão do CRM, LGPD, menu do admin e correções

Foco: destravar a captura de leads (LPs + site WordPress), documentar tudo, fechar o loop contrato→Kanban, entregar o wizard de promoção com auditoria, adicionar banner LGPD com documentos jurídicos, enxugar o menu do admin, corrigir o Health Score e gerar os ícones/PWA a partir dos novos logos.

Nenhuma feature de membro é removida; apenas o menu do admin é filtrado. Toda mudança é aditiva no banco e revisada mobile-first.

---

## 1. CRM — Ingestão de leads (LPs + Site WordPress + API)

**Diagnóstico atual:** a edge function `submit-lead` está pronta e aceita `source ∈ {lp_gentehub, lp_participe, lp_networking, site_elementor, convite_manual, api}`. Nenhum lead das LPs está entrando → o projeto "LPs Gente" nunca foi apontado para a URL da função. O site em WordPress não tem hoje um caminho oficial. Não é falha de código, é falta de integração + documentação.

**Entregas nesta plataforma (Comunidade):**
- Painel de "Como conectar leads" no topo do `AdminCrm` (colapsável, persistido em `localStorage`) mostrando:
  - URL pública da edge function `submit-lead` (com botão copiar).
  - Exemplo de payload por origem (`lp_gentehub`, `lp_participe`, `lp_networking`, `site_elementor`, `api`).
  - Explicação curta de cada filtro/origem (o que significa, quem dispara).
  - Link para a documentação nova (`/docs` internos e `docs/`).
- Tooltip explicativo em cada chip de filtro de origem no Kanban e na Auditoria.
- Nenhuma mudança nas regras de dedup/upsert do backend.

**Documentação nova (arquivos):**
- `docs/CRM_INGESTAO_LEADS.md` — visão geral das origens, contrato do payload, curl de exemplo, troubleshooting (409/400), como testar.
- `docs/INTEGRACAO_LPS_GENTE.md` — passo a passo para o projeto Lovable "LPs Gente" chamar `submit-lead` (fetch client-side + hidden fields de origem por LP). Inclui exemplo React pronto.
- `docs/INTEGRACAO_WORDPRESS.md` — três caminhos suportados no site atual em WordPress:
  1. **WPForms / Contact Form 7 / Elementor Forms + Webhook** (recomendado): configurar action "Webhook" apontando para `https://vyfkddcbmwlwldaorxzy.supabase.co/functions/v1/submit-lead` com header `apikey` (anon) e mapping de campos → `source: "site_elementor"`.
  2. **Zapier / Make** intermediário para forms que não suportam webhook nativo.
  3. **Snippet PHP** em `functions.php` (fornecido pronto) que dispara `wp_remote_post` no hook `wpcf7_mail_sent` / `elementor_pro/forms/new_record`.
- Todos os documentos ficam acessíveis dentro da plataforma via a página `/documentacao` (adicionar entradas no índice).

---

## 2. Assinatura de contrato → reflete no Kanban

Backend já grava `contract_status` via `autentique-webhook`. Precisamos garantir o loop de UI e a robustez do webhook.

- Confirmar/registrar a URL do webhook na conta Autentique (documentar em `docs/CRM_LEADS.md`).
- No `LeadDrawer`: banner grande com status atual do contrato + botão "Abrir link de assinatura" (já existe) + botão "Baixar PDF assinado" quando `contract_signed_pdf_path` estiver preenchido (usa `get-contract-url`).
- Realtime: assinar `postgres_changes` em `crm_leads` (filtro `id=eq.<lead>`) enquanto o drawer está aberto para atualizar status sem refresh. Cleanup no `useEffect`.
- Badge do card no Kanban (`ContractBadge`) já existe; adicionar a variante "expired" faltante e tooltip com data de envio/assinatura.
- Fallback: botão "Sincronizar status" no drawer que chama nova função `sync-contract-status` (consulta Autentique via GraphQL usando `autentique_document_id` e atualiza `crm_leads` + `crm_lead_history`). Cobre casos em que o webhook não chegou.

---

## 3. Wizard guiado de promoção (finalização)

Transformar `PromoteLeadDialog` em wizard multi-etapa:

1. **Validações** (readonly): conta criada?, grupo selecionado?, contrato assinado?, pagamento pago (para HUB)? Cada linha com ícone verde/amarelo/vermelho. Permite marcar "Pular com motivo" (motivo obrigatório).
2. **Destino**: seletor de grupo (destaca grupos `is_hub = true` como "Grupo Premium"). Opção "Mover para grupo premium" já cobre esse ramo.
3. **Confirmação**: resumo + botão "Promover".

- Chamada única para a RPC `promote_crm_lead_to_member` já existente (sem mudar assinatura; passamos `skip_reasons` como JSON). Se a RPC ainda não aceita skip, adicionar parâmetro opcional `_skip_reasons jsonb` de forma aditiva.
- Grava em `crm_lead_history` com `event_type = 'promoted_to_member'` incluindo `metadata` (grupo destino, validações puladas, timestamp, responsável). Já suportado.
- Permissões: somente `admin`. Facilitador vê o botão desabilitado com tooltip.

---

## 4. LGPD — Banner de cookies + documentos jurídicos

- Novo componente `LgpdBanner` fixo no rodapé em primeira visita (persistência em `localStorage: gente:lgpd-consent:v1` com `{ status, ts, categories }`). Opções: **Aceitar todos**, **Somente essenciais**, **Personalizar**. Não bloqueia navegação. Design alinhado ao brand (navy/orange).
- Novas páginas públicas (sem auth):
  - `/termos-de-uso` → `src/pages/legal/TermosDeUso.tsx`
  - `/politica-de-privacidade` → `src/pages/legal/PoliticaPrivacidade.tsx`
  - `/politica-de-cookies` → `src/pages/legal/PoliticaCookies.tsx`
- Textos redigidos conforme **LGPD (Lei 13.709/2018)**, **Marco Civil da Internet** e **CDC**, cobrindo: bases legais, dados coletados, finalidades, retenção, compartilhamento (Supabase, Resend, Cloudflare, Autentique), direitos do titular (arts. 17-22), canal do encarregado (DPO) por e-mail, cookies (essenciais/analíticos/marketing). Marcadas como "modelo editável — revisar com jurídico" no rodapé de cada documento (obrigatório para não induzir o usuário a assumir texto como parecer jurídico).
- Links no `Footer.tsx` da plataforma e um `<Link>` "Ler políticas" no próprio banner.
- SEO: `noindex` nas páginas legais opcional? Não — deixar indexáveis (melhor para transparência).

---

## 5. Correção: Health Score do admin (`column reference "user_id" is ambiguous`)

Causa: a função `get_members_health_scores` declara **OUT parameter** `user_id` no `RETURNS TABLE(...)`, e as CTEs internas (`refs`, `test`, `council`, `ga`, `att`, `bc`, `members`, `team_of`) usam alias/coluna também chamado `user_id`. O planner do PostgreSQL não sabe se, em joins como `ga.user_id = mem.user_id`, o `user_id` do lado direito é a OUT variable ou a coluna da CTE `members`.

Correção mínima e segura (migration aditiva, `CREATE OR REPLACE FUNCTION`): adicionar `#variable_conflict use_column` no topo do bloco plpgsql **e** renomear a OUT param para `out_user_id` (mais explícito) mantendo o mesmo shape de retorno via alias no SELECT (`p.id AS user_id` continua). Alternativa aceita: renomear as colunas das CTEs para `uid`. Vamos aplicar as duas medidas para blindar. Nenhuma mudança de schema, nenhum impacto em `useMemberHealthScores`.

---

## 6. Menu do admin — foco em gestão

Regra: o **admin** não pontua nem participa das mecânicas de networking, então o menu dele deve ocultar itens operacionais de membro. Membros/facilitadores continuam vendo tudo como hoje.

Itens **ocultos para `admin`** (mantidos para membro/facilitador):
- Feed, MatchMaking, Aniversários, Conselho 24/7
- Gente em Ação, Indicações, Negócios, Depoimentos, Oportunidades, Pedidos de Indicação
- Ranking

Itens **mantidos para `admin`**:
- Início/Dashboard, Membros, Convidados, Encontros (para acompanhar), Convites, Estatísticas, Conteúdos, Documentação, Changelog + todo o grupo Administração.

Implementação: adicionar campo opcional `hiddenForRoles?: string[]` nos items do `Sidebar.tsx` e filtrar em `filterItems`. Espelhar o mesmo filtro no `BottomNav.tsx` para mobile. Rotas continuam acessíveis por URL (não removemos guards) — só a navegação é enxuta.

---

## 7. PWA — variações de ícone a partir dos novos logos

- Gerar do arquivo `gente-comunidade-cor.png` (colorido, brand) as variações padrão PWA: `192x192`, `256x256`, `384x384`, `512x512`, `512x512 maskable`, `180x180 apple-touch`, `favicon-32x32`, `favicon-16x16`. Fundo navy `#1E3A5F` nas versões maskable para respeitar safe area.
- Substituir `public/icons/icon-*.png` e `public/apple-touch-icon.png`.
- Atualizar `public/manifest.webmanifest` (garantir `purpose: "maskable"` no 512 dedicado).
- Atualizar hero/emails para os novos assets do Gente Networking (`gente-networking-cor.png`) via `lovable-assets` quando aplicável, mantendo os hooks/refs já existentes (não trocar caminhos que já apontam para pointers válidos).

---

## 8. Documentação de UI/UX (desktop + mobile)

Novo `docs/UI_UX_GUIDELINES.md` consolidando:
- Regras de responsividade (referência `mem://design/responsive-rules`).
- Padrões de menu (sidebar colapsável desktop, BottomNav mobile, agrupamento).
- Padrões de drawer/dialog (CRM, contratos, promoção).
- Uso de badges de status (contratos, cobrança, leads).
- Checklist mobile antes de commit: sem overflow-x, textos com `text-wrap-anywhere` em strings longas, tabelas com `hscroll`, botões com área mínima 40px.

Atualizar `docs/CRM_LEADS.md` com o wizard novo, o painel de ingestão e a sincronização de contrato.

---

## 9. Changelog + memórias

- Nova entrada **v3.28.0** em `system_changelog` cobrindo todos os itens.
- Nova memória `mem://features/v3280-crm-lgpd-menu-admin.md` resumindo o escopo.
- Atualizar `mem://index.md` (uma linha).

---

## Detalhes técnicos

**Migrations (aditivas):**
- `fix_health_score_ambiguous_user_id.sql` — recria `get_members_health_scores` com `#variable_conflict use_column` e alias `uid` nas CTEs.
- (Se necessário) `promote_crm_lead_add_skip_reasons.sql` — adiciona parâmetro opcional `_skip_reasons jsonb DEFAULT '[]'` à RPC de promoção; registra em `metadata`.

**Edge functions:**
- Nova `sync-contract-status` (admin-only, checa JWT + role): consulta Autentique GraphQL por `document(id)` e atualiza `crm_leads.contract_status` + insere evento em `crm_lead_history`.

**Frontend:**
- `src/pages/AdminCrm.tsx`: painel "Como capturamos leads" no topo + tooltips nos filtros.
- `src/components/crm/LeadDrawer.tsx`: banner de contrato + botão "Sincronizar status" + botão "Baixar PDF".
- `src/components/crm/PromoteLeadDialog.tsx`: wizard 3 etapas.
- `src/components/LgpdBanner.tsx` (novo) montado em `App.tsx` no layout público/autenticado.
- `src/pages/legal/*.tsx` (3 novos) + rotas em `App.tsx`.
- `src/components/layout/Footer.tsx`: links legais.
- `src/components/layout/Sidebar.tsx` e `src/components/layout/BottomNav.tsx`: suporte a `hiddenForRoles`.
- `src/components/layout/PWAInstallPrompt.tsx`: sem mudança (já v3.27.0).

**Testes rápidos:**
- Rodar `supabase--linter` após migrations.
- Chamar `get_members_health_scores` como admin via `supabase--read_query` para validar ausência de erro.
- Smoke-test da `submit-lead` com curl documentado.

---

## Fora do escopo (confirmado)

- Não vamos escolher provedor de pagamento (mantido em aberto conforme decisão anterior).
- Não vamos alterar RLS de tabelas existentes.
- Não vamos remover rotas do admin — apenas ocultar da navegação.
