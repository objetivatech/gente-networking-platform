# Deploy no Cloudflare Pages - Gente Networking

Este guia detalha o passo a passo para implantar o projeto Gente Networking no Cloudflare Pages.

## Pré-requisitos

1. Conta no [Cloudflare](https://dash.cloudflare.com/sign-up)
2. Repositório Git (GitHub, GitLab ou Bitbucket) com o código do projeto
3. Acesso ao Supabase configurado

## Passo 1: Conectar o Repositório ao GitHub

No Lovable:
1. Clique em **GitHub** → **Connect to GitHub**
2. Autorize o Lovable GitHub App
3. Selecione a conta/organização onde o repositório será criado
4. Clique em **Create Repository**

## Passo 2: Acessar o Cloudflare Pages

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. No menu lateral, clique em **Workers & Pages**
3. Clique em **Create application**
4. Selecione a aba **Pages**
5. Clique em **Connect to Git**

## Passo 3: Conectar o Repositório

1. Autorize o Cloudflare a acessar seu GitHub
2. Selecione o repositório do projeto
3. Clique em **Begin setup**

## Passo 4: Configurar o Build

Preencha as configurações de build:

| Campo | Valor |
|-------|-------|
| **Project name** | `gente-networking` (ou nome desejado) |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (deixe vazio) |

### Variáveis de Ambiente (Environment Variables)

Não há variáveis de ambiente necessárias no frontend, pois o Supabase já está configurado no código.

> **Nota:** As credenciais do Supabase (URL e Anon Key) já estão no código do cliente, o que é seguro pois são chaves públicas.

## Passo 5: Deploy

1. Clique em **Save and Deploy**
2. Aguarde o build completar (geralmente 1-3 minutos)
3. Após o deploy, você receberá uma URL como: `gente-networking.pages.dev`

## Passo 6: Configurar Domínio Personalizado

Para usar `comunidade.gentenetworking.com.br`:

1. No painel do projeto no Cloudflare Pages, vá em **Custom domains**
2. Clique em **Set up a custom domain**
3. Digite: `comunidade.gentenetworking.com.br`
4. Clique em **Continue**
5. Adicione o registro DNS conforme instruído:
   - **Tipo:** CNAME
   - **Nome:** `comunidade`
   - **Conteúdo:** `gente-networking.pages.dev`
   - **TTL:** Auto
6. Aguarde a propagação DNS (até 24h, geralmente minutos)

## Passo 7: Configurar SSL

O Cloudflare configura automaticamente SSL/HTTPS para seu domínio. Verifique:

1. No dashboard do Cloudflare, vá em **SSL/TLS**
2. Certifique-se de que o modo está em **Full** ou **Full (strict)**

## Estrutura de Arquivos Importante

O projeto já possui os arquivos necessários para Cloudflare Pages:

```
/
├── public/
│   ├── _redirects      # Configuração de SPA routing
│   ├── robots.txt      # SEO
│   └── favicon.ico
├── src/                # Código fonte React
├── package.json        # Scripts de build
├── vite.config.ts      # Configuração Vite
└── index.html          # Entry point
```

### Arquivo `_redirects`

```
/* /index.html 200
```

Este arquivo é crucial para SPAs. Ele garante que todas as rotas retornem o `index.html`, permitindo que o React Router gerencie a navegação.

## Configurações Automáticas

O Cloudflare Pages já configura automaticamente:

- ✅ **Compressão Brotli/Gzip**
- ✅ **Cache de assets estáticos**
- ✅ **Headers de segurança básicos**
- ✅ **HTTP/3 e QUIC**
- ✅ **Preview deployments** (cada PR gera um preview)

## Troubleshooting

### Erro 404 em rotas

Se ao acessar diretamente uma rota como `/perfil` você receber 404:

1. Verifique se o arquivo `public/_redirects` existe
2. Confirme que o conteúdo é: `/* /index.html 200`

### Build falha

1. Verifique os logs de build no Cloudflare
2. Comum: versão do Node.js. Adicione variável de ambiente:
   - `NODE_VERSION`: `18`

### Assets não carregam

1. Verifique se o `base` no `vite.config.ts` está correto (deve ser `/`)
2. Limpe o cache do Cloudflare: **Caching** → **Purge Cache**

## Atualizações Automáticas

Com a integração GitHub configurada:

1. Qualquer push para a branch `main` dispara um novo deploy
2. PRs geram preview deployments automáticos
3. Cada deploy tem seu próprio URL único

## Monitoramento

No painel do Cloudflare Pages:

- **Analytics**: Visualize visitantes, requests e performance
- **Deployments**: Histórico de todos os deploys
- **Functions**: Logs (se usar Cloudflare Functions)

## Segurança Adicional (Recomendado)

No Cloudflare Dashboard:

1. **WAF** (Web Application Firewall):
   - Ative regras gerenciadas
   
2. **Page Rules** (se aplicável):
   - Sempre usar HTTPS
   
3. **Access** (opcional):
   - Restringir acesso por email/IP durante desenvolvimento

## Custos

Cloudflare Pages oferece um plano gratuito generoso:

- ✅ Unlimited sites
- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 500 builds/mês
- ✅ 100 custom domains

Para maioria dos projetos, o plano gratuito é suficiente.

---

## Resumo dos Comandos de Build

```bash
# Instalar dependências
npm install

# Build para produção
npm run build

# Preview local do build
npm run preview
```

## Contato

Para suporte técnico, consulte a [documentação do Cloudflare Pages](https://developers.cloudflare.com/pages/).
