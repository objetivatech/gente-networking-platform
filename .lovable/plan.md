# Correção do Changelog + Implementação do Pitch por IA

## 1. Corrigir a página de Changelog (bug crítico)

**Causa raiz:** a entrada `v3.6.0` na tabela `system_changelog` guarda o campo `changes` como uma lista de objetos `{ text, type }` em vez de uma lista de strings (todas as outras versões usam strings). O componente `ChangelogCard` renderiza `<span>{change}</span>` diretamente — ao receber um objeto, o React lança "Objects are not valid as a React child", que é capturado pelo `ErrorBoundary` e exibe a tela "Algo deu errado".

**Correção (frontend, sem mexer no banco):** em `src/pages/Changelog.tsx`, normalizar cada item de `changes` para texto antes de renderizar. Cada entrada pode ser:
- string → usar direto
- objeto `{ text }` → usar `change.text`

Isso conserta a v3.6.0 e blinda contra qualquer entrada futura mal formatada. A lógica de parsing no `useQuery` (que já trata array/string/JSON) será ajustada para também mapear objetos para seu `text`.

## 2. Implementar o Pitch por IA (recurso citado na doc, mas inexistente)

Hoje "Gerador de Pitch via IA" só existe na documentação (`Documentacao.tsx`). Não há edge function nem botão no Perfil. Vou implementá-lo de ponta a ponta usando o Lovable AI Gateway (a chave `LOVABLE_API_KEY` já está disponível no projeto).

### Backend — nova Edge Function `generate-pitch`
- `supabase/functions/generate-pitch/index.ts`
- Recebe os dados do perfil (nome, empresa, cargo, segmento, bio, "o que faço", "cliente ideal", "como me indicar", tags).
- Chama o Lovable AI Gateway (`google/gemini-3-flash-preview`) com um prompt em PT-BR para gerar um texto curto de apresentação profissional, ideal para encontros 1x1.
- Retorna `{ pitch: string }`. Trata erros 429 (limite) e 402 (créditos) com mensagens claras.
- Cabeçalho JSDoc de copyright Ranktop (padrão do projeto).
- Registrar a função em `supabase/config.toml`.

### Frontend — botão no Perfil
- Em `src/pages/Profile.tsx`, na aba "Sobre", adicionar um card/seção "Gerador de Pitch via IA" com botão "Gerar Pitch".
- Ao clicar, invoca a edge function com os dados do perfil atual, mostra loading e exibe o texto gerado em um `Textarea` com botão "Copiar".
- Aviso amigável caso o perfil esteja incompleto (sem "o que faço"/"cliente ideal"/bio), já que o resultado depende desses campos.

## 3. Documentação e Changelog
- Criar memória de feature `mem://features/ai-pitch-generator` (referenciada no índice mas inexistente) descrevendo o recurso.
- Adicionar nova entrada de Changelog **v3.12.0** (categoria feature) cobrindo o Pitch por IA + a correção da página de Changelog, via `system_changelog` (changes como array de strings, formato correto).

## Detalhes técnicos
```text
Fluxo Pitch:
Profile.tsx (botão) -> supabase.functions.invoke('generate-pitch', { profile })
   -> Edge Function -> Lovable AI Gateway (gemini-3-flash) -> { pitch }
   -> exibe em Textarea com "Copiar"
```
- Sem alterações de schema no banco; o Changelog é corrigido apenas no render.
- Edge function mantém `LOVABLE_API_KEY` no servidor (nunca exposta ao client).
- Sem impacto em CRM, gamificação, MatchMaking ou demais mecânicas existentes.