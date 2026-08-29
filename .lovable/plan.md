# v3.47.0 — Identidade única: LPs, auditoria de fusões, métricas e testes

## Contexto verificado

- `submit-lead` já retorna `409 already_member` e já faz dedupe por e-mail ou telefone (`phone_digits`, últimos 11 dígitos) chamando `crm_merge_leads`.
- O evento `lead_merged` é gravado em `crm_lead_history`, mas **não existe** em `CRM_EVENT_LABEL` (`src/hooks/useCrmLeads.ts`) — por isso ele aparece na auditoria com o nome cru e não pode ser filtrado.
- `crm_lead_pages` só registra uma página **depois** que ela envia o primeiro lead (auto-descoberta via `register_crm_lead_page`). Páginas publicadas que ainda não converteram não aparecem nos filtros.
- Testes: só existem `src/lib/__tests__/access-control.test.ts` e `src/hooks/__tests__/useGuestsDirectory.test.ts`. Não há cobertura para convites, presença ou desativação.
- O projeto "LPs Gente" é um projeto separado; aqui entrego o trecho pronto + documentação para aplicar lá.

## O que será feito

### 1. Trecho pronto para as LPs (409 already_member)
Documento novo `docs/LP_SNIPPET_409.md` com:
- Função JS única (`enviarLead`) que trata `409` exibindo "Você já faz parte do Gente" + botão de login (`/auth`), `200` como sucesso e demais códigos como erro genérico.
- Variante para formulários Elementor (hook em `submit_success`/`submit_error`) e variante React para as LPs feitas em Lovable.
- Texto de mensagem em PT-BR e classes neutras para adaptação visual.

### 2. Auditoria de fusões (`/admin/crm/auditoria`)
- Registrar `lead_merged` (e `already_member_blocked`) em `CRM_EVENT_LABEL` para aparecerem legíveis e filtráveis.
- Nova aba/visão "Fusões de contatos" na página de auditoria, listando cada fusão com: contato principal (nome/e-mail/telefone), duplicado arquivado, e-mails alternativos absorvidos, itens migrados (presenças, assinaturas, cobranças, resgates) e quem/quando — dados lidos do `metadata` do evento.
- Link direto para abrir o lead principal no CRM e exportação CSV/PDF reaproveitando o exportador atual.

### 3. Métricas de bloqueios e fusões
- `submit-lead` passa a registrar um evento de auditoria também quando bloqueia por `already_member` (hoje só responde 409, sem rastro), incluindo origem/página.
- Cards de métricas no topo da auditoria: bloqueios `already_member` e fusões `lead_merged` nos períodos 7/30 dias, com quebra por origem/página.
- Hook `useCrmIdentityMetrics` agregando esses números.

### 4. Cobertura de páginas de captação
- Botão "Sincronizar páginas" no painel de páginas do CRM que importa a lista de URLs conhecidas (sitemap/lista informada) e cria as entradas em `crm_lead_pages` com `leads_count = 0`, para que apareçam nos filtros antes da primeira conversão.
- Manter a auto-descoberta atual para páginas novas; a sincronização apenas antecipa o cadastro.
- Marcar visualmente páginas "sem conversões ainda".

### 5. Testes de regressão
Novos testes em `src/**/__tests__/`:
- **Convites**: prioridade do código do convite sobre o e-mail na atribuição de quem convidou.
- **Presença de convidados**: convidado com múltiplos convites aceitos enxerga os encontros de todos os grupos, incluindo HUB sem grupo.
- **Desativação**: chamada de desativação de convidado com a assinatura correta e tolerância a falha de log de atividade.
- **Dedupe**: normalização de telefone (últimos 11 dígitos) e escolha da chave e-mail OU telefone.

### 6. Documentação e changelog
- Atualizar `docs/CRM_INGESTAO_LEADS.md`, `docs/INTEGRACAO_LPS_GENTE.md` e `docs/CRM_LEADS.md`.
- Entrada v3.47.0 no changelog do sistema.

## Detalhes técnicos

- Migração necessária: nenhuma nova tabela; apenas inserção de eventos de auditoria com `event_type = 'already_member_blocked'` e, se preciso, índice em `crm_lead_history(event_type, created_at)` para as métricas.
- `crm_lead_pages` recebe as páginas sincronizadas via RPC existente `register_crm_lead_page` (sem incrementar contador) ou uma variante que aceite `count = 0`.
- Testes rodam com Vitest já configurado (`src/**/__tests__`), usando mocks do cliente Supabase — sem chamadas reais ao banco.
