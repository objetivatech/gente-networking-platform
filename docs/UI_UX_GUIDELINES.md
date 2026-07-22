# Diretrizes de UI/UX — Gente Comunidade

**Última atualização:** v3.28.0

Guia curto para manter consistência entre desktop e mobile em novas telas.

## Responsividade

- **Nunca** usar `overflow-x: hidden` global. Corrija a origem do overflow (strings
  longas, tabelas, imagens).
- Em qualquer flex container adicionar `min-w-0` nos filhos que podem transbordar.
- Textos com URLs, emails ou tokens: usar utilitário `.text-wrap-anywhere`.
- Grids devem ter breakpoint mobile primeiro: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`.
- Títulos: `text-2xl sm:text-3xl`. Corpo: `text-sm sm:text-base`.
- Ações principais visíveis sem scroll horizontal em ≥360px.

## Componentes

- Sempre reutilizar `shadcn/ui`. Não criar variações paralelas.
- Cards clicáveis: usar `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space).
- Diálogos: fechar por Escape e clique fora garantidos por `Dialog` do shadcn.
- Menu lateral: 6 grupos colapsáveis; estado persistido em `gente:sidebar-groups:v1`.
- Menus filtram por papel via `roles` e podem ocultar itens por papel com `hiddenForRoles`
  (ex.: admin não vê ferramentas de networking).

## Acessibilidade

- Todo `<img>` com `alt`. Ícones puramente decorativos: `aria-hidden="true"`.
- Combos de cor devem passar em contraste AA. Não usar apenas cor para transmitir estado.
- Formulários: `<label>` associado + mensagem de erro perto do campo.

## LGPD e conteúdos legais

- Banner de cookies (`LgpdBanner`) aparece na primeira visita; consentimento em
  `gente:lgpd-consent:v1`. Reabrir pela página `/politica-de-cookies`.
- Rodapé sempre com links para Termos de Uso, Política de Privacidade e Política de Cookies.

## Novas telas do CRM

- Cabeçalho com ícone + título + subtítulo curto.
- Painel colapsável "Como funciona" antes dos filtros quando a tela depender de fluxo externo.
- Kanban: cards com `min-w-0`, badges de origem/contrato, drawer para detalhes.

## Testes rápidos antes de fechar uma feature

1. Redimensionar preview até 360px de largura — verificar overflow.
2. Testar com papel `admin` e `membro` — checar menus/permissões.
3. Alternar dark mode.
4. Verificar que documentos legais e changelog foram atualizados quando aplicável.
