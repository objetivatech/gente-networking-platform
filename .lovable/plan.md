

## Plano: Eliminar Tela em Branco — Error Boundary Global + Fallback de Carregamento

### Diagnóstico

A tela em branco ocorre porque **nenhum erro é capturado no nível raiz do app**. Há três cenários prováveis:

1. **Erro no AuthProvider ou providers**: Se `supabase.auth.getSession()` falhar (rede instável, timeout), o erro propaga e não há nada para capturá-lo — o React simplesmente desmonta tudo e fica em branco.

2. **Falha no lazy loading**: Todas as páginas usam `lazy()`. Se o JS falhar no download (rede lenta, cache corrompido, deploy recente que invalidou chunks), o `Suspense` não tem tratamento de erro — resulta em branco.

3. **Erro em qualquer componente fora dos ErrorBoundary parciais**: Apenas 3 rotas têm ErrorBoundary. O `MainLayout`, `Index`, `Feed`, etc. — se qualquer um desses quebrar, tela em branco.

### Solução

#### 1. ErrorBoundary global em `main.tsx`
Envolver `<App />` inteiro em um ErrorBoundary. Qualquer erro não capturado mostrará uma tela de erro amigável com botão de recarregar, nunca branco.

#### 2. Retry automático no lazy loading
Criar wrapper `lazyWithRetry()` que tenta carregar o chunk até 3 vezes antes de falhar. Isso resolve falhas de rede intermitentes e deploys que invalidam chunks antigos.

#### 3. ErrorBoundary no `MainLayout`
Adicionar ErrorBoundary envolvendo o `<Outlet />` do MainLayout. Se uma página interna falhar, o layout (header, sidebar) permanece visível e o erro fica contido na área de conteúdo.

#### 4. Tratamento de erro no AuthProvider
Adicionar try/catch no `getSession()` do AuthContext. Se falhar, setar `loading=false` e continuar — o app vai para a tela de login ao invés de travar.

### Arquivos Impactados

| Arquivo | Mudança |
|---|---|
| `src/main.tsx` | Envolver `<App />` em ErrorBoundary global