# v3.43.0 — Desativação com perda real de acesso + Régua de Resgate (ex-membros e convidados)

## Problema confirmado

- `deactivate_member` (RPC atual) só remove dos grupos e marca `profiles.is_active = false`. Ela **não troca a role** e nada no app checa `is_active` no login/rotas (`AuthContext`/`MainLayout` só checam sessão). Resultado: membro desativado continua entrando com acesso de membro.
- Já existe `downgrade_member_to_guest` (admin-only) que faz o rebaixamento correto para `convidado`, preservando histórico.
- Não existe hoje nenhuma régua de follow-up: só há crons de aniversário e relatório mensal, e o log de envios (`notification_dispatch_log`) não está ligado ao CRM.

## Parte 1 — Desativar = rebaixar e bloquear

1. Nova RPC `deactivate_member` (v2, admin-only): remove de todos os grupos, troca a role para `convidado` (reaproveitando a lógica de `downgrade_member_to_guest`), marca `is_active=false`, `deactivated_at`, `deactivation_reason`, recalcula pontos do mês e registra em `activity_feed` + histórico CRM.
2. Bloqueio de acesso real:
  - Guard no `AuthContext`/`MainLayout`: se `profiles.is_active = false`, faz sign-out e mostra tela "Conta inativa" com CTA para o WhatsApp do Gente.
  - Reforço no banco: função `is_active_user()` e ajuste das policies sensíveis para exigir perfil ativo (leitura do próprio perfil continua permitida).
3. `reactivate_member` passa a exigir escolha de grupo e role de retorno (volta a `membro`/`facilitador`), mantendo histórico.

## Parte 2 — CRM: ex-membros e convidados como leads de resgate

- Ao desativar, cria/atualiza automaticamente um registro em `crm_leads` com `source='convite_manual'`/detalhe `ex_membro`, `profile_id` vinculado e `stage_key` "Resgate".
- Convidados já existentes entram na régua pela última presença em `attendances`/`meeting_lead_attendances`.
- Todo disparo grava evento em `crm_lead_history` (`event_type='rescue_email_sent'`) — a jornada aparece na timeline do lead no Kanban.

## Parte 3 — Régua automática de resgate

Nova tabela `rescue_campaigns` (configurável pelo admin: público, atraso em dias, assunto, corpo, CTA, ativo) e `rescue_dispatches` (fila/histórico: destinatário, campanha, etapa, status, agendado_para, enviado_em, motivo de cancelamento).

Regras iniciais (editáveis na tela, não hard-coded):

- **Ex-membros** (base: `deactivated_at`): etapa 1 em D+60; etapa 2 em D+45 após a 1ª; etapa 3 em D+30 após a 2ª. Antes de cada envio revalida: ainda é `convidado`/inativo e não voltou a ser membro — se converteu, cancela a régua.
- **Convidados** (base: última presença em evento premium/HUB): etapa 1 em D+30; etapa 2 em D+30 após a 1ª, cancelada se houver nova presença no intervalo.

Motor: edge function `rescue-runner` chamada por `pg_cron` diariamente (ex.: 12:00 UTC). Ela seleciona elegíveis, respeita o orçamento diário, envia via `send-email` (identidade visual Gente Networking) e registra em `rescue_dispatches` + `crm_lead_history` + `notification_dispatch_log`.

## Parte 4 — Controle do limite Resend (300/dia)

A Resend não expõe endpoint de quota restante. Abordagem:

1. Contador próprio: conta envios das últimas 24h em `notification_dispatch_log` (fonte de verdade local).
2. Orçamento diário configurável em `integration_settings` (padrão 300) com reserva para transacionais (ex.: 100 reservados para auth/convites/contratos) — a régua só consome o excedente.
3. Se o orçamento acabar, os disparos ficam `queued` e entram na fila do dia seguinte (nada é perdido, nada é bloqueado pela Resend).
4. Painel mostra "X de 300 usados hoje / Y na fila", e trata 429 da Resend reagendando automaticamente.

## Parte 5 — Nova tela admin `/admin/resgate`

- **Visão geral**: usados hoje vs. limite, fila agendada, enviados/aberturas por campanha, conversões (ex-membro que voltou, convidado que virou membro).
- **Pessoas**: lista de ex-membros e convidados elegíveis com etapa atual, próximo envio, botão "enviar agora", "pular etapa", "remover da régua".
- **Campanhas**: editor de mensagem com editor rico existente, variáveis (`{{nome}}`, `{{grupo}}`, `{{ultimo_evento}}`), preview e teste de envio.
- **Histórico**: todos os disparos com filtros e exportação CSV/PDF (reaproveitando `ExportButton`).

## Melhorias de marketing recomendadas (sugestões, todas opcionais)

1. **CTA WhatsApp com mensagem pré-preenchida e rastreável**: `https://wa.me/555121652325?text=...` com texto diferente por etapa e por público, mais parâmetro de origem para saber qual etapa gerou a conversa. **APROVADO!**
2. **Sequência por valor, não por insistência** — ex-membros: (1) "o que você perdeu" com números reais do grupo dele; (2) prova social — um case/depoimento recente; (3) oferta de retorno com condição especial e prazo. Convidados: (1) convite para o próximo encontro com data concreta; (2) escassez/vagas do grupo + benefício de membro. **APROVADO - NO CASO DA OFERTA ESPECIAL ELA DEVE SER CONFIGURÁVEL ANTES DO DISPARO NO ADMIN. NÃO TENHO ESSA POSSIVEL OFERTA DISPONIVEL NO MOMENTO.**
3. **Janela de envio inteligente**: terça a quinta, 9h–11h (horário de São Paulo), evitando fim de semana — melhora abertura sem custo. **APROVADO!**
4. **Pausa automática ("cool-off")**: se a pessoa responder no WhatsApp ou for marcada como "em conversa" no CRM, a régua pausa — evita mensagem robótica em cima de negociação. **APROVADO!**
5. **Opt-out obrigatório (LGPD)**: link de descadastro em todos os e-mails de resgate, gravado no perfil/lead, respeitado por todas as réguas futuras. **APROVADO!**
6. **Gatilho de reengajamento pré-desativação**: alerta ao facilitador quando o Health Score cai por 2 meses — prevenir a saída custa menos que resgatar. **APROVADO E DEVE SER DISPARADO PARA O ADMINISTRADOR TAMBÉM!**
7. **Convite para evento em vez de venda**: para convidados, converter via presença tem taxa muito maior do que via oferta direta; a etapa 1 deve sempre apontar para o próximo encontro real. **APROVADO!**

## Detalhes técnicos

- Migrations: nova versão de `deactivate_member`/`reactivate_member`, `is_active_user()`, tabelas `rescue_campaigns` e `rescue_dispatches` (com GRANTs + RLS admin-only), extensão de `crm_lead_history` com os novos `event_type`, cron diário.
- Edge functions: `rescue-runner` (motor da régua + orçamento) e reuso de `send-email`/`_shared/email-templates.ts` com dois novos templates (ex-membro e convidado) na identidade Gente Networking.
- Frontend: `src/pages/AdminResgate.tsx`, hook `useRescue.ts`, item no Sidebar (grupo administrativo, admin-only), função `canManageRescue` em `src/lib/access-control.ts` + teste de regressão.
- Documentação: novo `docs/RESGATE_E_REATIVACAO.md`, atualização de `docs/CRM_LEADS.md`, `docs/TECHNICAL_DOCUMENTATION.md`, `INVITATION_FLOW.md`, memórias do projeto e entrada v3.43.0 em `system_changelog`.