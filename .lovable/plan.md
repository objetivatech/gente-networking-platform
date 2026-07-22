
# v3.26.0 — Contratos gerenciáveis, menu inteligente e CRM completo

## Revisão do que já está entregue (v3.24 + v3.25)
- CRM unificado (`crm_leads` + `crm_lead_history`), Kanban com coluna **HUB Ativo**, badge/filtro HUB, drawer clicável com ações.
- Edge Functions: `submit-lead`, `send-contract` (Autentique GraphQL), `autentique-webhook`, `dispatch-hub-billing`, `get-contract-url`, `list-public-teams`, `migrate-existing-guests`.
- Storage `contracts` privado + `get-contract-url` (URL assinada de 5 min, admin-only).
- RPCs `promote_crm_lead_to_member` (com validações) e `add_crm_lead_note`.
- Página `/admin/crm/auditoria` com filtros + CSV.
- Trigger de roteamento HUB e trigger de cobrança em `qualificado`.

## Pendências identificadas (a corrigir nesta versão)
1. `send-contract` usa **HTML fixo hardcoded** — não dá para editar o contrato sem código.
2. Não há **variáveis dinâmicas** no contrato (nome, empresa, valor, plano, datas etc.).
3. Drawer não exibe **link de assinatura** (URL pública do Autentique) nem **status visual** (pendente/assinado/rejeitado) com destaque.
4. Cobrança HUB é apenas um email placeholder — falta **registrar tentativas, retry manual e estados** (pendente/enviada/paga/falha).
5. Auditoria só exporta CSV — falta **PDF** e filtro por **intervalo de datas**.
6. Sidebar tem 22+ itens planos — sem agrupamento, difícil de usar no mobile.
7. Promoção existe, mas não é um **wizard guiado** — é um dialog único.

---

## 1. Modelos de contrato editáveis (nova feature)

**Nova tabela `contract_templates`** (admin-only):
- `name`, `slug` (único), `description`
- `body_html` (template com placeholders `{{nome}}`, `{{email}}`, `{{empresa}}`, `{{plano}}`, `{{valor}}`, `{{data_hoje}}`, `{{grupo}}`)
- `variables_schema` (JSONB descrevendo campos que o admin preenche antes de enviar)
- `is_active`, `is_default`, `version` (incrementa a cada save)
- `created_by`, timestamps
- RLS: leitura/escrita apenas `admin`. GRANTs adequados.

**Nova tabela `contract_template_versions`** para snapshot histórico de cada alteração (auditoria de contrato).

**UI `/admin/contratos`** (nova rota admin):
- Lista de modelos com badge "Padrão" / "Ativo".
- Editor com preview lado-a-lado (Textarea com HTML + `dangerouslySetInnerHTML` sanitizado do preview).
- Chips clicáveis para inserir placeholders.
- Botão "Definir como padrão".
- Responsivo: em mobile, editor e preview empilhados em tabs (Editar / Prévia).

**Refatorar `send-contract`**:
- Aceita `template_id` (opcional; usa padrão se omitido) e `variables` (objeto chave-valor com o que o admin preencheu).
- Renderiza placeholders no servidor com escape HTML.
- Salva `template_id`, `template_version` e `variables_used` em `crm_leads` (novas colunas) e em `crm_lead_history.metadata`.

**Fluxo no Drawer** (novo botão "Enviar contrato"):
- Abre modal `SendContractDialog` com:
  - Select do modelo (padrão pré-selecionado).
  - Form dinâmico gerado a partir de `variables_schema` (ex.: valor mensal, plano HUB, observações).
  - Pré-preenchimento automático com dados do lead (nome, email, empresa).
  - Prévia final antes de enviar.

## 2. Status de contrato + link de assinatura no lead

- Adicionar coluna `contract_signing_url` em `crm_leads` (armazena URL pública Autentique retornada em `createDocument`).
- `send-contract` passa a extrair `signatures { public_id link { short_link } }` do payload GraphQL e persistir a URL.
- **Drawer**: bloco destacado "Contrato" com:
  - Badge colorido: `pendente` (cinza), `enviado` (azul), `assinado` (verde), `rejeitado` (vermelho).
  - Botão "Abrir link de assinatura" (quando `sent`).
  - Botão "Copiar link" (para reenvio manual).
  - Botão "Baixar PDF" (quando `signed`).
  - Timestamp da última mudança.
- **Kanban**: ícone de contrato no card já existe; adicionar tooltip e cor por status.
- `autentique-webhook` já salva PDF; adicionar tratamento do evento `document.rejected` → seta `contract_status='rejected'` e loga em histórico.

## 3. Cobrança HUB — regras automáticas robustas

**Nova tabela `hub_billing_events`**:
- `lead_id`, `event_type` (`triggered`, `email_sent`, `payment_link_sent`, `paid`, `failed`, `retry`), `status`, `payload` (JSONB), `attempt`, `created_at`.
- RLS admin-only.

**Refatorar `dispatch-hub-billing`**:
- Idempotente (não dispara 2x para o mesmo lead sem retry manual).
- Registra cada tentativa em `hub_billing_events` E em `crm_lead_history` (event_type `hub_billing_*`).
- Atualiza `crm_leads.payment_status` conforme progresso.
- Aceita `force_retry: true` para reenvio manual.

**Trigger DB**: ao mover HUB lead para `qualificado`, insere evento `triggered` e chama a function via `pg_net` (ou registra pendência e o front dispara — vamos usar registro pendente + botão no drawer, mais simples e auditável).

**Drawer HUB** — nova seção "Cobrança":
- Status atual + histórico de tentativas.
- Botão "Reenviar cobrança" (admin).
- Botão "Marcar como pago manualmente" (com motivo obrigatório, logado).

## 4. Wizard guiado de promoção lead → membro

Substituir `PromoteLeadDialog` por wizard multi-step (`Stepper`):
1. **Validação**: checklist visual (conta criada, contrato assinado, pagamento pago se HUB, grupo selecionado). Cada item com ícone verde/vermelho e ação corretiva ("Enviar contrato agora", "Marcar pago", "Convidar para criar conta").
2. **Configuração**: seleciona grupo destino (com destaque para grupos HUB se `is_hub`), role final (`membro` padrão).
3. **Confirmação**: resumo + campo de observação obrigatório para auditoria.
4. Executa RPC `promote_crm_lead_to_member` e mostra sucesso.

Responsivo: steps em coluna única no mobile, horizontal no desktop.

## 5. Timeline expandida no drawer

Estender `LeadAuditTimeline`:
- Agrupamento por dia (headers "Hoje", "Ontem", `dd/MM/yyyy`).
- Ícones distintos por `event_type` (origem/LP, status, contract_sent, contract_signed, contract_rejected, hub_billing_*, payment_paid, note_added, promoted_to_member).
- Mostrar **origem** (LP/HUB/manual) em cada evento.
- Mostrar **responsável** com nome + avatar quando disponível.
- Colapsável ("Ver mais" após 10 eventos).
- Mobile: card empilhado; Desktop: linha do tempo lateral.

## 6. Exportação da auditoria (CSV + PDF + filtros de data)

`/admin/crm/auditoria`:
- Novos filtros: **date-range picker** (`from`/`to`), origem, event_type, from_status, to_status (já existem parcialmente).
- Botão "Exportar" com dropdown: **CSV** (existe) + **PDF** (novo, via `jspdf` + `autotable` já no projeto).
- PDF inclui cabeçalho com filtros aplicados, contagem total, tabela paginada.
- Nome do arquivo inclui range de datas.

## 7. Reorganização do menu (Sidebar + BottomNav)

**Novo `Sidebar` com grupos colapsáveis** (usando shadcn `Collapsible`):

- **Início** (link direto)
- **Feed** (link direto)
- **Comunidade** (grupo)
  - Membros, Convidados, Aniversários, MatchMaking
- **Networking** (grupo)
  - Gente em Ação, Depoimentos, Negócios, Indicações, Oportunidades, Pedidos de Indicação
- **Encontros & Conteúdo** (grupo)
  - Encontros, Conteúdos, Conselho 24/7
- **Performance** (grupo)
  - Estatísticas, Ranking
- **Meu espaço** (grupo)
  - Meu Perfil, Convites, Configurações
- **Ajuda** (grupo)
  - Changelog, Documentação
- **Administração** (grupo, admin/facilitador)
  - Dashboard, Gestão de Pessoas, CRM de Leads, Auditoria CRM, Modelos de Contrato, Gestão de Registros, Admin

Comportamento:
- Persistir estado aberto/fechado em `localStorage` por grupo.
- Auto-abrir o grupo que contém a rota ativa.
- Mobile (sheet): mesma estrutura; grupos começam fechados exceto o ativo.
- BottomNav mobile: manter 5 atalhos (Início, Feed, Membros, Encontros, Perfil) — sem mudar.

## 8. Responsividade e documentação (transversal)

- Todos os novos componentes seguem regras já registradas em `mem://design/responsive-rules` (min-w-0, text-wrap-anywhere, sem overflow-x hidden global).
- Testar cada tela nova em 375px e 1280px.
- Documentar em:
  - `docs/CRM_LEADS.md` — seções "Modelos de contrato", "Cobrança HUB", "Wizard de promoção", "Auditoria".
  - Novo `docs/CONTRACT_TEMPLATES.md` — como criar/editar modelos, lista de placeholders, versionamento.
  - `docs/TECHNICAL_DOCUMENTATION.md` — nova estrutura do menu.
- Nova entrada em `system_changelog` (v3.26.0).
- Atualizar memória: `mem://features/crm-leads-unificado.md`, criar `mem://features/contract-templates`, criar `mem://design/menu-structure`, atualizar `mem://index.md`.

---

## Detalhes técnicos

### Migração (uma única, ordenada)
1. `CREATE TABLE public.contract_templates (...)` + GRANTs (admin) + RLS + policies.
2. `CREATE TABLE public.contract_template_versions (...)` + GRANTs + RLS.
3. `CREATE TABLE public.hub_billing_events (...)` + GRANTs + RLS.
4. `ALTER TABLE crm_leads ADD COLUMN contract_signing_url text, template_id uuid REFERENCES contract_templates, template_version int, contract_variables jsonb`.
5. Trigger `contract_templates_bump_version` (snapshot em versions a cada UPDATE).
6. Seed do modelo padrão (o HTML atual do `send-contract`).

### Edge Functions
- Refatorar `send-contract`: aceita `template_id` + `variables`, renderiza, salva `contract_signing_url`.
- Refatorar `autentique-webhook`: trata `document.rejected`.
- Refatorar `dispatch-hub-billing`: idempotente + registra em `hub_billing_events`.
- Nenhuma function nova (mantém superfície mínima).

### Frontend novos arquivos
- `src/pages/AdminContractTemplates.tsx`
- `src/components/contracts/ContractTemplateEditor.tsx`
- `src/components/crm/SendContractDialog.tsx`
- `src/components/crm/PromoteLeadWizard.tsx` (substitui dialog)
- `src/components/crm/HubBillingPanel.tsx`
- `src/components/layout/SidebarGroup.tsx` (colapsável)
- `src/hooks/useContractTemplates.ts`
- `src/hooks/useHubBilling.ts`
- Rota `/admin/contratos` em `App.tsx`.

### Fora de escopo
- Integração real com gateway de pagamento (mantém decisão adiada da v3.24).
- Editor rich-text WYSIWYG — usar textarea HTML + preview (evita dependência nova).

## Riscos e mitigação
- **Quebrar contratos em andamento**: mantém coluna `body_html` no lead atual até assinatura; template versionado garante que reenvios usam a versão certa.
- **Menu quebrar navegação**: preservar todas as rotas atuais; só reagrupar. Testes visuais em `/` para cada role.
- **Trigger de cobrança duplicando**: idempotência por `lead_id + status='pending'`.
