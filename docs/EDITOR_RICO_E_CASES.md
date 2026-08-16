# Editor rico, Cases em 4 passos e Página pública (v3.38.0)

## 1. Editor de texto rico

Os campos longos da plataforma passaram a usar um editor rico leve
(`src/components/RichTextEditor.tsx`), com negrito, itálico, sublinhado, listas,
título simples, link e limpar formatação.

- O conteúdo é gravado como **HTML sanitizado** (DOMPurify) — sem markdown e sem JSON.
- Utilitários em `src/lib/rich-text.ts`:
  - `sanitizeRichText` — limpa o HTML antes de gravar;
  - `toDisplayHtml` — converte HTML novo **ou texto puro legado** para exibição;
  - `richTextToPlain` — texto puro para e-mails, exportações, SEO e validações;
  - `isRichTextEmpty` — validação de campo vazio.
- A exibição usa `src/components/RichText.tsx` (tipografia `prose` + `text-wrap-anywhere`).

**Campos com editor rico:** Perfil (bio, o que faço, cliente ideal, como me indicar),
Cases, Gente em Ação (observações), Negócios (descrição), Depoimentos, Encontros (descrição),
Indicações (observações), Conselho 24/7 (dúvida e respostas), Oportunidades e
Pedidos de Indicação (descrição e respostas).

**Compatibilidade:** registros antigos em texto puro continuam funcionando — são
detectados e exibidos em parágrafos, sem migração de dados.

## 2. Cases em 4 passos

Tabela `business_cases` ganhou `client_context`, `problem`, `solution`, `success_result`
e `needs_review`.

- Novos cases exigem os quatro passos: **Cliente → Problema → Solução → Sucesso**.
- Cases antigos foram migrados: `description → solution` e `result → success_result`,
  com `needs_review = true` para sinalizar complemento de Cliente/Problema.
- `description` e `result` continuam sendo gravados em espelho, mantendo relatórios,
  Health Score e estatísticas existentes intactos.
- Exibição em colunas com ícone e título (Perfil, Perfil de membro e página pública),
  empilhando em uma coluna no celular.

## 3. Página pública do membro (`/m/:slug`)

- **Meus Resultados no Gente Networking** — `get_public_profile_stats(_slug)` devolve
  apenas totais (presenças, Gente em Ação, depoimentos, indicações e valor em negócios)
  de perfis ativos com publicação habilitada.
- **Carrossel de cases** — `get_public_profile_cases(_slug)`; dois cases por vez
  (um no celular), ordem aleatória, troca a cada 5 segundos, com pausa no hover/toque
  e navegação manual.

Ambas as funções são `SECURITY DEFINER`, respeitam `public_profile_enabled` e `is_active`,
e não expõem dados de contato.
