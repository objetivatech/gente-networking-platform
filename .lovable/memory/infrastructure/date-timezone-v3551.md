---
name: Datas no fuso de Brasília (v3.55.1)
description: Nunca gerar datas com toISOString().slice(0,10) — usar todayLocalISODate(); exibição sempre DD/MM/AAAA via formatDateBR()
type: constraint
---

- `new Date().toISOString().slice(0, 10)` retorna a data em UTC: após 21h (BRT)
  vira "amanhã" no Brasil. Isso fazia assinaturas atribuídas à noite nascerem
  com início no dia seguinte e constarem como inativas na tela do Assinante.
- Regra: usar `todayLocalISODate()` de `src/lib/date-utils.ts` (fuso
  America/Sao_Paulo) para qualquer data padrão de formulário ou filtro "hoje".
- No banco, checagens de vigência usam `(now() AT TIME ZONE 'America/Sao_Paulo')::date`
  e o padrão de `admin_assign_person_plan._start_date` também é a data de Brasília.
- Exibição de datas sempre em DD/MM/AAAA via `formatDateBR()` de
  `src/lib/date-utils.ts` (assinaturas, cobranças, encontros).
