
# v3.27.0 — Identidade nas imagens, PWA persistente e CRM completo

Escopo dividido em 6 frentes. Tudo revisado desktop + mobile e documentado ao final.

## 1. Imagens do Gente aplicadas ao app (assets + PWA)

- Publicar via `lovable-assets` os 6 uploads: `gente-comunidade-cor.png`, `gente-comunidade-2.png` (branco), `gente-networking-cor.png`, `gente-networking-2.png` (branco), e as 3 fotos de reunião (`1768355357092`, `1768490884426`, `1781456022738`).
- Substituir referências:
  - App interno (Sidebar, Header, cartão, emails no app) → logo **Gente Comunidade** (cor no claro / branco no escuro e em fundos navy).
  - Landing/páginas públicas (`Auth`, `ConvitePublico`, `GuestWelcome`, `RedefinirSenha`, `AuthConfirm`, `Instalar`, `PublicProfile`, `SEO` og:image) e emails externos → logo **Gente Networking**.
  - Hero das telas públicas (`Auth`, `ConvitePublico`, `GuestWelcome`, `Instalar`) e ilustração no `PWAInstallPrompt` → foto `1781456022738` (versão com identidade Gente) como imagem principal; usar as outras 2 fotos como variações em cards secundários.
- Regenerar/gravar os PNGs do PWA (`public/icons/icon-*.png`, `icon-maskable-*`, `apple-touch-icon`, `logo-gente-card.png`, `logo-gente-branco.png`, `logo-gente.png`, `logo-gente-comunidade.png`, `logo-gente-networking.png`) a partir do logo colorido do Gente Comunidade, mantendo padding seguro para maskable (safe area de 20%). Splash Apple recriada com fundo navy `#1E3A5F` + logo branco centralizado.
- `manifest.webmanifest`: revisar `name`, `short_name`, `theme_color #1E3A5F`, `background_color #FFFFFF`, `icons` (novos hashes), `shortcuts` mantidos.
- Purge do Worker Cloudflare para os paths de logos/ícones após deploy.

## 2. PWA Install Prompt persistente

`src/components/PWAInstallPrompt.tsx` e `src/hooks/usePWAInstall.ts`:

- Aparece **sempre** (mobile via `beforeinstallprompt`, iOS via detecção UA + `!isStandalone`, desktop Chromium/Edge via `beforeinstallprompt`).
- "Agora não" → grava `pwa-banner-dismissed = Date.now()` e reaparece após **2 dias** (48h), não 7.
- Detecção de instalação:
  - Escutar evento `appinstalled` → grava `pwa-installed = true` e nunca mais mostra.
  - Checar `window.matchMedia('(display-mode: standalone)')` e `navigator.standalone` (iOS) → considera instalado.
  - Se `isStandalone` ou `pwa-installed` presente → não renderiza.
- Ilustração do card usa a nova foto Gente + microcopy revisada.
- Também exposto botão manual "Instalar agora" na página `/instalar` sem alteração de fluxo.

## 3. Auditoria CRM — exportação CSV/PDF + filtros

`src/pages/AdminCrmAuditoria.tsx`:

- Novos filtros: `from_status`, `to_status`, `date_from`, `date_to` (date pickers) além dos já existentes (busca, evento, origem).
- `useCrmAuditFeed` aceitar range de datas server-side (paginação segura, mantém limit 500 por padrão).
- Botão **Exportar CSV** (já existe) e novo **Exportar PDF** via `jsPDF` + `jspdf-autotable` (mesmo padrão do `ExportButton`), com cabeçalho branded (logo Gente Networking) e linha de filtros aplicados.
- Layout responsivo: filtros em grid `sm:grid-cols-2 lg:grid-cols-5`, ações empilhadas no mobile.

## 4. Status do contrato no card do lead + Kanban

`src/pages/AdminCrm.tsx` (`LeadCard`) e `LeadDrawer.tsx`:

- Adicionar badge de contrato colorida no card do Kanban (`Pendente`, `Enviado`, `Assinado`, `Rejeitado`, `Expirado`) com o mesmo mapping já usado no drawer.
- Card mostra ícone de link se `contract_signing_url` presente.
- `autentique-webhook`: garantir que ao evento `signed` o PDF é baixado e salvo em `contracts/{lead_id}/{doc_id}.pdf` (já existe) e o Kanban recebe update via invalidação/realtime (`crm_leads` já publicado). Confirmar `contract_signed_pdf_path` alimentado no webhook.
- Drawer: já expõe "Abrir link de assinatura" e "Baixar PDF" — reorganizar bloco Contrato em card próprio com timestamps (`contract_sent_at`, `contract_signed_at`) e botão "Copiar link".

## 5. Fluxo guiado de promoção (finalização)

`PromoteLeadDialog.tsx` + RPC `promote_crm_lead_to_member`:

- Transformar em wizard de 3 passos (Stepper): **1) Validações** (checklist atual) → **2) Grupo destino** (com destaque `is_hub` quando aplicável e opção "Mover para grupo premium" filtrando `teams.is_hub = true`) → **3) Confirmação** (resumo + motivo se aplicável).
- Permissões: admin sempre; facilitador **apenas se** lead pertence ao seu grupo destino (validação no RPC via `has_role` + `team_members`).
- Registrar no `crm_lead_history` evento `promoted_to_member` com metadata `{ team_id, previous_team_id, skip_contract, skip_payment, reason }` (já parcialmente existente — completar campos).
- Bloqueio explícito quando `needsAccount` ou contrato HUB pendente sem justificativa.

## 6. Versionamento de modelos de contrato + reatribuição

`contract_template_versions` já existe (snapshot criado em cada save). Ampliar:

- Editor `AdminContractTemplates.tsx` / `ContractTemplateEditor.tsx`:
  - Aba "Versões" com lista (versão, autor, data, diff resumido) e ação **Restaurar** (cria nova versão a partir da anterior).
  - Prévia comparando versão selecionada vs atual.
- Novo botão **Reatribuir modelo em leads existentes**:
  - Modal admin: escolhe template + versão + filtro de leads (`status`, `is_hub`, `contract_status ∈ {not_sent, rejected, expired}`).
  - Ação em massa atualiza `crm_leads.contract_template_id` e `contract_template_version` **sem apagar `contract_variables` nem histórico**; leads com contrato `sent`/`signed` são preservados (opção "forçar" desabilitada para não quebrar auditoria).
  - Cada alteração gera evento `contract_template_reassigned` em `crm_lead_history` com `{ from_template, to_template, from_version, to_version }`.
- `send-contract` já usa `template.version` — nenhum breaking change no fluxo Autentique.

## 7. Responsividade + documentação

- Regressão mobile em: Kanban CRM (cards), drawer, wizard de promoção, editor de contratos (aba versões), auditoria (filtros/PDF), popup PWA e páginas públicas com nova hero.
- Aplicar regras de `mem://design/responsive-rules` (min-w-0, `.text-wrap-anywhere`, sem overflow global).
- Atualizações de docs:
  - `docs/PWA_IMPLEMENTATION.md` — política de reexibição 2 dias + `appinstalled` + iOS.
  - `docs/CRM_LEADS.md` — status de contrato no card, wizard de promoção, versionamento e reatribuição de modelos, filtros de auditoria + PDF.
  - `docs/TECHNICAL_DOCUMENTATION.md` — nova asset library (Gente Comunidade × Networking) e uso por contexto.
  - `src/pages/Changelog.tsx` — entrada **v3.27.0** consolidando tudo.
- Memórias:
  - Nova `mem://features/v3270-pwa-crm-contratos.md`.
  - Atualizar `mem://features/crm-leads-unificado.md` (adicionar versionamento + reatribuição + wizard).
  - Atualizar `mem://design/visual-identity.md` (dois logos por contexto).

## Detalhes técnicos

### Migrations

```sql
-- 1. Metadados de reatribuição
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

-- 2. Índices p/ auditoria com range de datas
CREATE INDEX IF NOT EXISTS idx_crm_history_created_at ON public.crm_lead_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_history_event_type ON public.crm_lead_history (event_type);

-- 3. RPC de reatribuição em massa (admin-only)
CREATE OR REPLACE FUNCTION public.reassign_contract_template(
  _template_id uuid,
  _version int,
  _lead_ids uuid[]
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;
```

Grants padrão: `EXECUTE ... TO authenticated`; função valida `has_role(auth.uid(),'admin')` internamente.

### Arquivos afetados (novos/alterados)

- `src/components/PWAInstallPrompt.tsx`, `src/hooks/usePWAInstall.ts`
- `src/pages/AdminCrm.tsx` (badge contrato no card), `src/components/crm/LeadCard.tsx` (se existir, senão inline)
- `src/components/crm/LeadDrawer.tsx`, `src/components/crm/PromoteLeadDialog.tsx` → wizard
- `src/pages/AdminCrmAuditoria.tsx` (filtros + PDF)
- `src/pages/AdminContractTemplates.tsx`, `src/components/contracts/ContractTemplateEditor.tsx`, novo `ContractTemplateVersionsPanel.tsx`, novo `ReassignTemplateDialog.tsx`
- `src/hooks/useContractTemplates.ts` (restore version, reassign mutation)
- `supabase/functions/autentique-webhook/index.ts` (confirmar gravação de `contract_signed_at` + `contract_signed_pdf_path`)
- Migration em `supabase/migrations/…`
- Docs: `docs/PWA_IMPLEMENTATION.md`, `docs/CRM_LEADS.md`, `docs/TECHNICAL_DOCUMENTATION.md`, `src/pages/Changelog.tsx`
- Assets: `src/assets/logo-gente-comunidade.*.asset.json`, `logo-gente-networking.*.asset.json`, `hero-networking-*.asset.json`; PNGs do PWA em `public/icons/` e `public/logo-*.png`

### Não escopo

- Provedor de pagamento (Efi/Stripe) — usuário adiou.
- Refatoração do sidebar/menu (já entregue em v3.26.0).
- Mudanças em RLS de tabelas fora do CRM/contratos.

Sem breaking changes; RPC de reatribuição é aditiva e nunca sobrescreve leads com contrato ativo.
