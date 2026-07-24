
## Diagnóstico

### 1. Erro "Webhook error" no formulário do site (Elementor)
A Edge Function `submit-lead` **não está declarada em `supabase/config.toml`**, então herda o padrão `verify_jwt = true`. O Elementor Forms → Webhook envia um POST **sem** os headers `apikey` / `Authorization: Bearer <anon>`, portanto o Supabase rejeita com **401 antes de a função rodar**. O Elementor mostra isso como "Webhook Webhook error" (mensagem genérica).

Além disso, o webhook nativo do Elementor envia `application/x-www-form-urlencoded`, e nossa função só faz `await req.json()` — mesmo que o JWT passasse, cairia em 500.

### 2. LPs Gente não sincronizando leads
- `submit-lead` **não tem nenhum log** (`No logs found`), ou seja, nenhuma requisição das LPs está chegando.
- O código `src/lib/comunidadeCrm.ts` no projeto LPs Gente está correto (envia `apikey` + `Authorization`), mas ele só executa se `VITE_COMUNIDADE_SUBMIT_LEAD_URL` e `VITE_COMUNIDADE_ANON_KEY` existirem em **build-time** no Cloudflare Pages. Se estiverem vazias, o `console.warn` "Skipping CRM sync" aparece e nada é enviado (fail-silent).
- Também é possível que as envs existam mas a última build da LP tenha sido feita antes de elas serem definidas (Vite injeta em build, não em runtime).

## Correções (projeto Gente Comunidade)

### A. Tornar `submit-lead` pública e tolerante a Elementor

1. **`supabase/config.toml`** — adicionar bloco:
   ```toml
   [functions.submit-lead]
   verify_jwt = false
   ```
   Isso elimina o 401 e permite que WordPress/Elementor/qualquer LP externa chame direto. A segurança continua garantida por Turnstile + validação Zod + enum fechado de `source`.

2. **`supabase/functions/submit-lead/index.ts`** — aceitar `application/json` **e** `application/x-www-form-urlencoded`/`multipart/form-data`:
   - Detectar `Content-Type`.
   - Se não for JSON, ler `await req.formData()`, converter em objeto plano, e passar pelo mesmo `BodySchema`.
   - Manter todo o restante da lógica intacto.

3. **CORS** — já é `*`, ok.

### B. Documentação atualizada

- **`docs/INTEGRACAO_WORDPRESS.md`**: remover o aviso "Elementor não envia headers customizados / precisa proxy PHP". Após A.1, o webhook Elementor puro funciona com URL da função + `source=site_elementor` como campo hidden. Manter os passos, simplificando a Opção B.
- **`docs/CRM_INGESTAO_LEADS.md`** (se existir): registrar que a função aceita form-urlencoded.

### C. Diagnóstico para as LPs Gente (não altera código lá)

Ainda no projeto Comunidade, adicionar em `docs/INTEGRACAO_LPS_GENTE.md` um checklist de verificação:
1. Confirmar no painel Cloudflare Pages do projeto LPs Gente que as variáveis `VITE_COMUNIDADE_SUBMIT_LEAD_URL` e `VITE_COMUNIDADE_ANON_KEY` estão **presentes em Production e Preview** (não apenas Preview).
2. **Refazer o deploy** após qualquer mudança de env (Vite congela envs em build-time).
3. Como validar rapidamente: abrir uma LP em produção, abrir DevTools → Network, enviar um lead, procurar POST para `functions.supabase.co/submit-lead`. Se não houver requisição, as envs estão vazias no bundle. Se houver e retornar 401, o `verify_jwt` ainda está ligado (correção A.1). Se 400, ver `details` no body.

## Verificação após implantar

1. `curl` direto sem headers de auth, simulando Elementor:
   ```bash
   curl -X POST https://vyfkddcbmwlwldaorxzy.functions.supabase.co/submit-lead \
     -d 'name=Teste&email=teste@ex.com&source=site_elementor'
   ```
   Deve retornar `200` com `lead_id`.
2. Enviar formulário real do site → conferir card em `/admin/crm` com badge "Site".
3. Enviar formulário de uma LP em produção → conferir card com badge "LP HUB" (ou correspondente).
4. Consultar `supabase--edge_function_logs submit-lead` para confirmar chegada.

## Fora de escopo (para não quebrar nada)

- **Não alterar** `submit-lead` além do parser e do `verify_jwt`.
- **Não alterar** o projeto LPs Gente neste plano — o problema lá é configuração de env vars em Cloudflare, feita manualmente pelo usuário. Só entrego o checklist.
- **Não mexer** em `verify-turnstile`, `autentique-webhook`, `generate-pitch`.

## Changelog

Registrar em `system_changelog` versão **v3.32.0** com título "Correção de ingestão de leads (Elementor + LPs)" e a lista de mudanças acima.
