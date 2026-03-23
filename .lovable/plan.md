## Plano: Correção URGENTE do Fluxo de Convites

### Diagnóstico

Dois problemas identificados:

**Problema 1 — "Verificação falhou" (Turnstile)**: O widget Cloudflare Turnstile está falhando na verificação. A edge function `verify-turnstile` está funcionando (testei e retorna corretamente), mas o token gerado pelo widget está sendo rejeitado pelo Cloudflare. Causa provável: **o site key `0x4AAAAAACp4c13EYVpO8Vxd` está configurado no Cloudflare para domínios específicos** que não incluem os domínios atuais (`comunidadegente.lovable.app` e `id-preview--*.lovable.app`). Quando o domínio não bate, o Turnstile gera um token inválido que falha na verificação server-side.

**Problema 2 — Página em branco**: Pode ocorrer se o script do Turnstile falhar ao carregar (bloqueado por ad-blocker, falha de rede, etc.), ou se algum erro JS no `ConvitePublico.tsx` ocorre antes do render.

### Correções

#### 1. Tornar Turnstile resiliente a falhas (correção imediata)

Em `CadastroConvidado.tsx`:

- Adicionar tratamento de erro no Turnstile: se o widget falhar ao carregar ou verificar, permitir o cadastro sem ele (fallback graceful)
- Adicionar timeout: se o Turnstile não carregar em 5 segundos, considerar como indisponível e prosseguir
- Manter a verificação quando funciona, mas não bloquear o fluxo quando falha

Em `CloudflareTurnstile.tsx`:

- Adicionar callback `onLoad` para indicar quando o widget carregou
- Adicionar estado de erro para quando o script falha ao carregar

#### 2. Adicionar Error Boundary nas páginas públicas

Envolver `ConvitePublico` e `CadastroConvidado` em um error boundary simples para evitar tela em branco por erros de JS.

#### 3. Mover o site key para variável de ambiente

Mover `TURNSTILE_SITE_KEY` de hardcoded para `VITE_TURNSTILE_SITE_KEY` no `.env`, facilitando a troca quando necessário.

### Detalhes Técnicos

`**CloudflareTurnstile.tsx**`: Adicionar estados `error` e `timedOut`, com timeout de 5s. Chamar `onError` se o script não carrega. Expor estado via novo prop `onStatusChange`.

`**CadastroConvidado.tsx**`: Modificar a lógica de verificação:

```
// Se Turnstile está disponível e gerou token → verificar
// Se Turnstile falhou ao carregar → pular verificação (log warning)
// Se Turnstile carregou mas token expirou → pedir retry
```

`**.env**`: Adicionar `VITE_TURNSTILE_SITE_KEY=0x4AAAAAACp4c13EYVpO8Vxd`

### Recomendação Importante - JA FOI REALIZADO NO CLOUDFLARE!

O site key do Turnstile precisa ser reconfigurado no painel do Cloudflare para incluir os domínios corretos:

- `comunidadegente.lovable.app`
- `*.lovable.app` (para preview)
- Qualquer domínio customizado futuro

Sem isso, o Turnstile continuará falhando. A correção no código garante que o fluxo não seja bloqueado enquanto a configuração é ajustada.

### Ordem de Execução

1. Atualizar `CloudflareTurnstile.tsx` com fallback e timeout
2. Atualizar `CadastroConvidado.tsx` para não bloquear quando Turnstile falha
3. Adicionar variável de ambiente para o site key
4. Adicionar error boundary nas páginas públicas