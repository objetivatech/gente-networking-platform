---
name: Editor rico, Cases 4 passos e perfil público v3.38.0
description: HTML sanitizado em campos longos, cases Cliente/Problema/Solução/Sucesso e blocos de resultados + carrossel na página pública
type: feature
---

# v3.38.0 — Fase 3

## Editor rico
- `RichTextEditor` (contenteditable leve) + `RichText` (renderização `prose`) + `src/lib/rich-text.ts`
  (`sanitizeRichText`, `toDisplayHtml`, `richTextToPlain`, `isRichTextEmpty`) com DOMPurify.
- Gravar sempre **HTML sanitizado**; nunca markdown/JSON. Texto puro legado continua exibindo normal.
- Usar `richTextToPlain` em e-mails, exportações (Excel/PDF), SEO/meta e validações Zod de tamanho.
- Campos: Perfil (bio, o que faço, cliente ideal, como me indicar), Cases, Gente em Ação (notes),
  Negócios (description), Depoimentos, Encontros (description), Indicações (notes),
  Conselho (dúvida/respostas), Oportunidades e Pedidos de Indicação (descrição/respostas).

## Cases em 4 passos
- `business_cases`: `client_context`, `problem`, `solution`, `success_result`, `needs_review`.
- Obrigatórios nos cases novos; legado migrado (description→solution, result→success_result, needs_review=true).
- `description`/`result` continuam espelhados para não quebrar relatórios/estatísticas.

## Página pública `/m/:slug`
- `get_public_profile_stats(_slug)` e `get_public_profile_cases(_slug)` (SECURITY DEFINER),
  respeitam `public_profile_enabled` e `is_active`; sem dados de contato.
- Carrossel: 2 cases (1 no mobile), ordem aleatória, 5s, pausa no hover/toque.

Docs: `docs/EDITOR_RICO_E_CASES.md`. Changelog: v3.38.0.
