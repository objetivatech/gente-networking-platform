# Integração — LPs Gente → CRM

**Versão:** v3.28.0

Este guia mostra como conectar os formulários do projeto **LPs Gente** (Landing Pages
independentes da Comunidade) ao CRM.

## 1. Descobrir a URL da Edge Function

No projeto Supabase da **Gente Comunidade**, a função `submit-lead` está exposta em:

```
https://<PROJECT_REF>.functions.supabase.co/submit-lead
```

Onde `<PROJECT_REF>` é o ref do projeto Supabase da Comunidade (visível no painel).
Anote também a `anon key` (publishable) do mesmo projeto.

## 2. Configurar variáveis nas LPs

No projeto **LPs Gente**, adicione no `.env` (ou variáveis do Cloudflare Pages):

```env
VITE_COMUNIDADE_SUBMIT_LEAD_URL=https://<PROJECT_REF>.functions.supabase.co/submit-lead
VITE_COMUNIDADE_ANON_KEY=<anon-key-da-comunidade>
```

> A `anon key` é pública por design — pode ir no bundle. Nunca use `service_role`.

## 3. Envio a partir de um formulário

```ts
async function submitLead(payload: Record<string, unknown>) {
  const res = await fetch(import.meta.env.VITE_COMUNIDADE_SUBMIT_LEAD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_COMUNIDADE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_COMUNIDADE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`submit-lead falhou: ${res.status}`);
  return res.json();
}

// Uso em um handler de LP HUB
await submitLead({
  name: form.name,
  email: form.email,
  phone: form.phone,
  company: form.company,
  segment: form.segment,
  source: 'lp_gentehub',           // ← muda por LP
  utm: getUtmFromUrl(),
  cf_turnstile_token: turnstileToken,
});
```

### Qual `source` usar em cada LP

| Página                                                             | `source`          |
| ------------------------------------------------------------------ | ----------------- |
| LP Gente HUB (assinatura premium)                                  | `lp_gentehub`     |
| LP Participe / Solicitar convite / Abrir novo grupo                | `lp_participe`    |
| LP institucional Gente Networking                                  | `lp_networking`   |

## 4. Teste

- Envie um lead de teste da própria LP em produção.
- Confirme em `/admin/crm` (aba principal) que o card apareceu.
- Para LPs HUB, o card aparece com badge **HUB** e entra na coluna correspondente.
- Verifique também `/admin/crm/auditoria` para o registro `lead_created`.

## 5. Turnstile (recomendado)

As LPs devem exibir o widget do Cloudflare Turnstile e enviar o token no campo
`cf_turnstile_token`. A Edge Function chama internamente `verify-turnstile` — se falhar,
o lead é rejeitado com `400`, protegendo o CRM contra bots.

## 6. Diagnóstico — leads não chegam ao CRM

Checklist rápido antes de abrir chamado:

1. **Variáveis presentes em Cloudflare Pages** (projeto LPs Gente → Settings →
   Environment Variables): `VITE_COMUNIDADE_SUBMIT_LEAD_URL` e
   `VITE_COMUNIDADE_ANON_KEY` precisam existir **tanto em Production quanto em
   Preview**. O Vite congela essas envs em build-time, então ausência = leads
   silenciosamente descartados (aparece `console.warn "Skipping CRM sync"` no
   navegador).
2. **Refazer o deploy** depois de qualquer mudança de env. Sem novo build, o
   bundle continua com os valores antigos (ou vazios).
3. **Rede**: abra uma LP em produção → DevTools → Network → envie um lead.
   - Sem requisição para `functions.supabase.co/submit-lead` → envs vazias no bundle.
   - `200` → chegou; conferir `/admin/crm`.
   - `400` com `invalid_payload` → conferir campo `source` (deve ser um dos enums
     válidos: `lp_gentehub`, `lp_participe`, `lp_networking`, `site_elementor`,
     `convite_manual`, `api`).
   - `500` → checar logs em Supabase → Edge Functions → submit-lead.
4. **Logs da função**: `Supabase Dashboard → Edge Functions → submit-lead → Logs`.
   Cada payload rejeitado é logado com `raw:` para inspeção.

## 7. Erros comuns

- **401 Unauthorized** → não deve mais ocorrer (função é pública desde v3.32.0);
  se aparecer, verificar se o `verify_jwt = false` continua em `supabase/config.toml`.
- **400 invalid source** → o valor de `source` precisa estar na lista permitida
  (`docs/CRM_INGESTAO_LEADS.md`).
- **CORS blocked** → a função já retorna `Access-Control-Allow-Origin: *`; se o navegador
  reclamar, geralmente é um proxy/CDN entre a LP e o Supabase (revise o worker).
