# CRM — Ingestão de Leads

**Versão:** v3.34.0 · Agosto/2026

Este documento explica como um lead chega ao CRM da Gente Comunidade, por origem,
e como configurar cada fonte.

## Arquitetura

Toda origem escreve **na mesma tabela** `crm_leads` através da **Edge Function pública**
`submit-lead`. O que muda por origem é apenas o campo `source`:

```
[LP / Site / API / Convite manual]
        │
        ▼
POST https://<PROJETO>.functions.supabase.co/submit-lead
        │
        ▼
crm_leads (Supabase da Gente Comunidade)
        │
        ▼
AdminCrm.tsx (/admin/crm) — Kanban + Drawer + Auditoria
```

- Leads com `source = "lp_gentehub"` disparam automaticamente o roteamento HUB
  (trigger no banco) e a criação do evento de cobrança quando entram no status
  `qualificado`.
- Todos os leads criam entrada em `crm_lead_history` para auditoria.

## Payload padrão

```jsonc
POST /functions/v1/submit-lead
Content-Type: application/json

{
  "name": "Nome do Lead",
  "email": "lead@empresa.com.br",
  "phone": "+55 51 9xxxxxxxx",   // opcional, mas recomendado
  "company": "Empresa X",         // opcional
  "segment": "Contabilidade",     // opcional
  "source": "lp_gentehub",        // ver tabela abaixo
  "utm": {                        // opcional
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "gente-hub-lancamento"
  },
  "notes": "Texto livre"          // opcional
}
```

Retorno esperado: `200 OK` com `{ "ok": true, "lead_id": "uuid" }`.

## Origens suportadas (`source`)

| Origem                     | `source`          | Uso                                                                     |
| -------------------------- | ----------------- | ----------------------------------------------------------------------- |
| LP Gente HUB               | `lp_gentehub`     | Formulários do produto Gente HUB nas LPs. Dispara cobrança + contrato. |
| LP Participe / Convite     | `lp_participe`    | Landing pages de captação para eventos ou aberturas de grupo.           |
| LP Networking (institucional) | `lp_networking` | LP da marca Gente Networking.                                           |
| Site WordPress             | `site_elementor`  | Formulários do site principal (`gentenetworking.com.br`).               |
| API externa                | `api`             | CRMs próprios do usuário, planilhas automatizadas, integrações Zapier.  |
| Convite manual             | `convite_manual`  | Criação direta por admin/facilitador dentro da plataforma.              |

## Como cada origem envia

- **LPs Gente** → veja [`INTEGRACAO_LPS_GENTE.md`](./INTEGRACAO_LPS_GENTE.md).
- **WordPress (site institucional)** → veja [`INTEGRACAO_WORDPRESS.md`](./INTEGRACAO_WORDPRESS.md).
- **API externa** → mesmo payload acima, autenticando com o `apikey` público do Supabase da
  Comunidade. Não usar chave `service_role` no cliente.
- **Convite manual** → botão "Novo lead" no `AdminCrm` (ou promoção manual a partir da
  gestão de convidados).

## Grupo e página: automáticos (v3.34.0)

- **Grupo**: envie `target_team_name` (texto do grupo). O CRM resolve o `team_id` por nome
  normalizado. Sem correspondência, o lead fica **sem grupo** — e só é classificado como
  Gente HUB quando `source = "lp_gentehub"`, preservando a leitura do funil.
- **Página**: envie `page_url`. Cada página é registrada automaticamente em `crm_lead_pages`
  e aparece no painel/filtro **Páginas de captação** do `/admin/crm`. Nenhuma LP precisa ser
  cadastrada manualmente.
- **Formulários externos**: chaves com colchetes (`fields[email][value]`, `form_fields[email]`)
  são interpretadas corretamente pela função.

## Segurança e boas práticas

- A função `submit-lead` tem CORS aberto e valida os campos obrigatórios (nome, email, source
  permitido). Emails inválidos são rejeitados com `400`.
- Recomendado usar Turnstile (Cloudflare) nas LPs antes do envio; a função aceita o token via
  `cf_turnstile_token` e valida por `verify-turnstile`.
- Rate limit natural pelo Supabase (nível gateway) evita floods; para picos previsíveis,
  proteja também no formulário/CDN.
- Nenhuma origem grava direto na tabela; sempre pela função — assim os triggers de auditoria e
  roteamento HUB rodam corretamente.

## Diagnóstico rápido

- **Não vejo leads da LP** → confira a URL da Edge Function em produção e o `source`; abra
  o console do navegador no envio do formulário e veja o status HTTP.
- **Lead entrou mas sem grupo** → o roteamento HUB depende de existir grupo `is_hub = true`.
  Marque um grupo como HUB em `/admin/grupos`.
- **Contrato/cobrança não disparou** → só ocorre para `source = "lp_gentehub"` ao mover para
  `qualificado`. Veja a página `/admin/crm/auditoria`.

## Identidade única e deduplicação (v3.46.0)

Regras aplicadas dentro do `submit-lead`, antes de qualquer gravação:

1. **Bloqueio na origem** — se o e-mail **ou** o telefone informado pertencer a um usuário
   ativo com papel membro, facilitador ou admin, nenhum lead/convite é criado. A função
   responde `409` com:
   ```json
   { "ok": false, "already_member": true, "message": "Você já faz parte do Gente...", "login_url": "..." }
   ```
   A LP deve exibir essa mensagem e oferecer o login (não tratar como erro de envio).
2. **Chave de identidade** — e-mail (case-insensitive) **ou** `phone_digits` (telefone só com
   dígitos, últimos 11). Colunas geradas em `crm_leads` e `profiles`, com índices.
3. **União automática** — havendo mais de um contato ativo com a mesma identidade, o mais
   antigo é mantido e os demais são unidos via `crm_merge_leads`: presenças em encontros,
   assinaturas, cobranças, eventos de cobrança HUB, disparos de resgate e histórico são
   transferidos; o duplicado é **arquivado** (nunca apagado) com `metadata.merged_into`.
4. **E-mails alternativos** — quando a mesma pessoa envia um e-mail diferente, o e-mail
   principal do card é preservado e o novo fica em `metadata.alt_emails`.

Toda união gera um registro `lead_merged` em `crm_lead_history`, visível em
`/admin/crm/auditoria`.

## Observabilidade da identidade única (v3.47.0)

- **Bloqueios auditados** — todo `409 already_member` grava um evento
  `already_member_blocked` na tabela `crm_identity_events` (e-mail, telefone
  normalizado, perfil correspondente, origem, `page_key` e `page_url`). O registro
  é feito de forma não bloqueante: falha no log nunca impede a resposta à LP.
- **Painel** — `/admin/crm/auditoria` passou a ter três abas:
  - **Eventos** — trilha completa já existente, com filtros e exportação CSV/PDF;
  - **Fusões de contatos** — cada `lead_merged` com contato principal, duplicado
    arquivado (e-mail/telefone) e itens de histórico migrados;
  - **Bloqueios na origem** — cadastros barrados por já serem membros, com a página
    de captação de origem.
- **Métricas** — cartões no topo da página com bloqueios e fusões em 7 dias, 30 dias
  e total acumulado.
- **Páginas de captação** — além da auto-descoberta no primeiro lead, o CRM ganhou o
  botão **Sincronizar páginas** (`crm_register_known_page`), que cadastra LPs já
  publicadas com `leads_count = 0` para aparecerem nos filtros de origem antes da
  primeira conversão. Páginas sem conversão são sinalizadas como "sem conversões ainda".
- **Snippet para as LPs** — ver `docs/LP_SNIPPET_409.md` (JavaScript puro, Elementor e React).
