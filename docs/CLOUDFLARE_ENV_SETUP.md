# Configuração de Variáveis de Ambiente no Cloudflare Pages

## Problema

Ao acessar a aplicação em produção, você pode encontrar o erro:
```
Uncaught Error: supabaseUrl is required.
```

Isso acontece porque as variáveis de ambiente do Supabase não estão configuradas no Cloudflare Pages.

## Solução

Você precisa adicionar as variáveis de ambiente no painel do Cloudflare Pages.

### Passo a Passo

1. **Acesse o Dashboard do Cloudflare Pages**
   - Faça login em https://dash.cloudflare.com
   - Navegue até "Workers & Pages"
   - Clique no seu projeto (comunidade.gentenetworking.com.br)

2. **Configure as Variáveis de Ambiente**
   - Clique na aba "Settings" (Configurações)
   - Role até a seção "Environment variables" (Variáveis de ambiente)
   - Clique em "Add variable" (Adicionar variável) ou "Edit variables" (Editar variáveis)

3. **Adicione as seguintes variáveis**:

   **Para o ambiente de Production:**
   ```
   VITE_SUPABASE_URL = https://vyfkddcbmwlwldaorxzy.supabase.co
   ```
   ```
   VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_EPVu6Lp9miUs9f3rvWj8YQ_CiUV1zoE
   ```

   **Opcional (se você também usar Preview):**
   - Marque a opção para aplicar também ao ambiente "Preview" se desejar

4. **Salve as alterações**
   - Clique em "Save" (Salvar)

5. **Faça um novo deploy**
   - As variáveis de ambiente só serão aplicadas no próximo deploy
   - Opção 1: Faça um commit e push no repositório para acionar um novo deploy automaticamente
   - Opção 2: Na aba "Deployments", clique em "Retry deployment" no último deploy

### Verificação

Após o novo deploy:
1. Limpe o cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)
2. Acesse o link do convite novamente
3. A aplicação deve carregar corretamente

### Observações Importantes

- ⚠️ As variáveis devem começar com `VITE_` para serem expostas no build do Vite
- ⚠️ Não coloque aspas nos valores das variáveis no Cloudflare Pages
- ⚠️ Após adicionar as variáveis, é necessário fazer um novo deploy
- ⚠️ As variáveis de ambiente são sensíveis - não as compartilhe publicamente

## Variáveis Necessárias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anônima (pública) do Supabase | `eyJhbGc...` |

## Onde Encontrar as Chaves do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em "Settings" > "API"
4. Copie:
   - **Project URL** → para `VITE_SUPABASE_URL`
   - **anon/public key** → para `VITE_SUPABASE_PUBLISHABLE_KEY`

## Troubleshooting

### Ainda aparece erro após configurar

1. Verifique se fez um novo deploy após configurar as variáveis
2. Limpe o cache do navegador completamente
3. Tente em uma aba anônima
4. Verifique no console do navegador se há outros erros

### Como verificar se as variáveis foram aplicadas

No console do navegador, você pode verificar (mas lembre-se que isso expõe as chaves públicas):
```javascript
console.log('SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
```

Se retornar `undefined`, as variáveis não foram configuradas corretamente.
