# CRM — Ingestão de Leads

**Versão:** v3.28.0 · Julho/2026

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
