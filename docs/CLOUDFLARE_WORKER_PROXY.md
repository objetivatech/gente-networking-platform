# Estratégia de Performance — Cloudflare Worker Proxy

## Visão Geral

O sistema utiliza um Cloudflare Worker como proxy reverso entre o frontend e a API REST do Supabase, adicionando **edge caching** para endpoints de leitura frequente. Isso reduz a latência percebida pelo usuário e diminui a carga no banco de dados.

```
┌──────────┐     ┌─────────────────────┐     ┌──────────────┐
│ Frontend │────▶│ Cloudflare Worker    │────▶│  Supabase    │
│  (React) │◀────│ (Edge Cache + Proxy) │◀────│  REST API    │
└──────────┘     └─────────────────────┘     └──────────────┘
```

## Arquitetura

### Endpoints Cacheados

| Endpoint | TTL (s) | Stale-While-Revalidate (s) | Justificativa |
|----------|---------|---------------------------|---------------|
| `/rest/v1/profiles` | 120 | 300 | Perfis mudam raramente |
| `/rest/v1/teams` | 300 | 600 | Times quase nunca mudam |
| `/rest/v1/team_members` | 120 | 300 | Mudanças são admin-only |
| `/rest/v1/monthly_points` | 60 | 120 | Atualiza durante o mês |
| `/rest/v1/rpc/get_monthly_ranking` | 60 | 120 | Ranking é hot path |
| `/rest/v1/rpc/get_user_monthly_points` | 60 | 120 | Consultado frequentemente |
| `/rest/v1/system_changelog` | 600 | 1200 | Raramente muda |
| `/rest/v1/contents` | 300 | 600 | Conteúdos mudam pouco |
| `/rest/v1/meetings` | 120 | 300 | Consultado frequentemente |

### Endpoints NÃO Cacheados (Proxy Direto)

- Todas as operações de **escrita** (POST, PUT, PATCH, DELETE)
- `attendances` — muda a cada presença registrada
- `gente_em_acao` — lançamentos frequentes
- `business_deals`, `referrals`, `testimonials` — dados transacionais
- `council_posts`, `council_replies` — interações em tempo real
- `activity_feed` — atualizado constantemente

### Headers de Diagnóstico

O Worker adiciona headers de diagnóstico a cada resposta:

| Header | Valores | Significado |
|--------|---------|-------------|
| `X-Cache` | `HIT` | Servido do cache da edge |
| `X-Cache` | `MISS` | Buscado do Supabase, agora em cache |
| `X-Cache` | `BYPASS` | Endpoint não cacheável |
| `X-Cache-TTL` | `60`, `120`, etc. | TTL configurado em segundos |

## Deploy

### Pré-requisitos

```bash
npm install -g wrangler
wrangler login
```

### Configurar Secrets

```bash
cd cloudflare-worker
wrangler secret put SUPABASE_URL
# Cole: https://vyfkddcbmwlwldaorxzy.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# Cole a anon key do projeto
```

### Deploy

```bash
cd cloudflare-worker
npm install
wrangler deploy
```

### Configurar Rota (Opcional)

Para usar um subdomínio personalizado (ex: `api.gentenetworking.com.br`):

1. No `wrangler.toml`, descomente e ajuste a seção `routes`
2. Configure o DNS no Cloudflare para apontar o subdomínio ao Worker
3. Atualize o frontend para usar o novo domínio

### Monitoramento

```bash
# Logs em tempo real
wrangler tail

# Métricas no dashboard
# https://dash.cloudflare.com → Workers & Pages → gente-supabase-proxy → Metrics
```

## Integração com o Frontend

### Opção 1: Subdomínio Dedicado (Recomendado)

Aponte `api.gentenetworking.com.br` ao Worker e atualize `VITE_SUPABASE_URL`:

```env
VITE_SUPABASE_URL=https://api.gentenetworking.com.br
```

O cliente Supabase continuará funcionando normalmente, pois o Worker é um proxy transparente.

### Opção 2: Fetch Wrapper (Sem mudar URL)

Crie um wrapper que redireciona apenas os endpoints cacheáveis:

```typescript
const WORKER_URL = 'https://gente-supabase-proxy.seu-account.workers.dev';
const CACHED_PATHS = ['/rest/v1/profiles', '/rest/v1/teams', ...];

async function cachedFetch(path: string, options?: RequestInit) {
  if (CACHED_PATHS.some(p => path.startsWith(p))) {
    return fetch(`${WORKER_URL}${path}`, options);
  }
  return fetch(`${SUPABASE_URL}${path}`, options);
}
```

## Invalidação de Cache

### Manual (via API)

```bash
curl -X POST "https://gente-supabase-proxy.workers.dev/purge?path=/rest/v1/profiles"
```

### Automática (via Supabase Webhook — futuro)

Configure um webhook no Supabase que chame `/purge` quando dados são modificados:

```sql
-- Exemplo: purgar cache de profiles quando um perfil é atualizado
-- Configurar via Supabase Dashboard → Database → Webhooks
```

## Métricas de Performance Esperadas

| Métrica | Sem Worker | Com Worker |
|---------|-----------|-----------|
| Latência (ranking) | ~200-400ms | ~20-50ms (cache HIT) |
| Latência (perfis) | ~150-300ms | ~15-40ms (cache HIT) |
| Requisições ao Supabase | 100% | ~30-40% (60-70% servidos do cache) |
| TTFB médio | ~300ms | ~50ms |

## Segurança

- **CORS restrito**: Apenas origens autorizadas (`comunidade.gentenetworking.com.br`, `comunidadegente.lovable.app`)
- **Secrets**: `SUPABASE_URL` e `SUPABASE_ANON_KEY` são armazenados como secrets do Worker
- **Headers sanitizados**: Headers de IP e infraestrutura do Cloudflare são removidos antes de repassar ao Supabase
- **Autenticação preservada**: Tokens JWT do usuário são repassados ao Supabase para endpoints que requerem auth

## Outras Otimizações Cloudflare em Uso

| Recurso | Configuração | Impacto |
|---------|-------------|---------|
| **Cloudflare Turnstile** | Formulário de cadastro de convidados | Anti-bot, reduz spam |
| **Web Analytics (RUM)** | Beacon no `index.html` | Core Web Vitals, métricas reais |
| **Cloudflare Pages** | Deploy automático via GitHub | Build otimizado, CDN global |
| **Cache Rules** | Assets estáticos (`/assets/*`) | Cache de 1 ano para JS/CSS/imagens |
| **Auto Minify** | HTML, CSS, JS | Redução de tamanho de payload |
| **Brotli** | Compressão automática | ~15-20% menor que gzip |
