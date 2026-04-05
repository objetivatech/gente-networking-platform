
Diagnóstico revisado

- O problema principal não aponta para “publish no Lovable”. Como o app público está no GitHub + Cloudflare Pages, esse fluxo é o que importa aqui.
- A falha raiz está no frontend, especialmente na página Início (`src/pages/Index.tsx`), com expressões que quebram enquanto os dados ainda estão `undefined`, por exemplo:
  - `meetings?.filter(...).slice(0, 3)`
  - `profile?.full_name?.split(' ')[0]`
- Quando a Home quebra, o `ErrorBoundary` do `MainLayout` entra em estado de erro e não é resetado ao trocar de rota. Isso faz parecer que “todas as páginas” falharam.
- Nas outras rotas, ao recarregar, a página volta porque o erro não existe nelas. Na Início, o reload cai no mesmo bug e falha novamente.

Plano de implementação

1. Corrigir a Home de forma definitiva
- Reescrever `src/pages/Index.tsx` para usar valores seguros antes de renderizar:
  - listas: `meetings ?? []`
  - nome: `profile?.full_name?.split(' ')?.[0] ?? 'Membro'`
- Eliminar qualquer encadeamento inseguro sobre dados assíncronos.

2. Resetar o erro por navegação
- Ajustar `src/components/layout/MainLayout.tsx` para que o `ErrorBoundary` seja recriado ao mudar de rota.
- Assim, um erro da Home não “contamina” Feed, Perfil, Estatísticas etc.

3. Fazer uma varredura preventiva no app
- Corrigir padrões inseguros semelhantes em arquivos já identificados:
  - `src/pages/GuestWelcome.tsx`
  - `src/hooks/useAdminDashboard.ts`
  - `src/hooks/useTeams.ts`
  - `src/pages/GestaoPessoas.tsx`
  - `src/hooks/useAdminGuests.ts`
- Foco em padrões como:
  - `?.filter(...).length/slice/map/reduce`
  - `?.map(...).filter(...)`
  - `?.split(...)[0]`

4. Endurecer hooks e renderização
- Garantir que hooks retornem arrays/objetos padrão quando dados auxiliares ainda não chegaram.
- Evitar que uma query secundária derrube a tela inteira quando o restante da página pode continuar carregando.

5. Documentação e changelog
- Atualizar a documentação técnica e o changelog com:
  - causa raiz real do incidente
  - padrão obrigatório de “safe defaults” em dados assíncronos
  - comportamento esperado dos `ErrorBoundary` por rota

Detalhes técnicos

- Não há indício, neste diagnóstico, de problema de banco ou de Supabase como causa primária.
- Não é uma correção de infraestrutura; é uma correção de runtime no frontend.
- Não exige migration SQL. O foco é React/TypeScript e resiliência de renderização.

Resultado esperado

- A página Início deixa de quebrar no carregamento.
- As demais páginas não ficam mais presas no fallback de erro após uma falha isolada.
- O app continua exibindo erro amigável quando necessário, mas sem tela branca e sem falso “erro global”.
