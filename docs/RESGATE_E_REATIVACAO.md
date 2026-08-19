# Resgate e Reativação (v3.43.0)

Documento oficial do fluxo de desativação de membros, perda de acesso e da régua
automática de resgate de ex-membros e convidados.

## 1. Desativação de membro

RPC `public.deactivate_member(_member_id, _reason)` — admin (e facilitador do grupo, quando aplicável).

Ao desativar:

1. `profiles.is_active = false`, `deactivated_at`, `deactivation_reason`.
2. Remoção de **todos** os vínculos em `team_members`.
3. Papel rebaixado para `convidado` em `user_roles`.
4. `public_profile_enabled = false` (perfil público sai do ar e do sitemap).
5. Criação/atualização de um lead em `crm_leads` marcado como ex-membro, para
   acompanhamento comercial.
6. Agendamento da régua de resgate (ver seção 3).

Nada é apagado: pontos, presenças, indicações, depoimentos, negócios, cases,
Gente em Ação e feed permanecem intactos.

## 2. Perda de acesso

- SQL: `public.is_active_user(uuid)` — usado por policies sensíveis.
- Front-end: `src/components/layout/MainLayout.tsx` consulta `profiles.is_active`
  e exibe a tela **"Acesso desativado"** com CTA de WhatsApp e botão de sair.
  Nenhuma rota autenticada renderiza para contas inativas.

## 3. Régua de resgate

Tabelas:

- `rescue_campaigns` — conteúdo e cadência de cada etapa (`audience`, `step`,
  `delay_days`, `subject`, `body_html`, `offer_html`, `cta_label`,
  `whatsapp_message`, `active`).
- `rescue_dispatches` — fila/histórico (`scheduled`, `sent`, `failed`,
  `cancelled`, `skipped`) com unicidade por destinatário + etapa.

Cadência padrão:

| Público    | Etapa | Gatilho                                   |
| ---------- | ----- | ----------------------------------------- |
| Ex-membro  | 1     | 60 dias após a desativação                |
| Ex-membro  | 2     | +45 dias                                  |
| Ex-membro  | 3     | +30 dias                                  |
| Convidado  | 1     | 30 dias após a última participação        |
| Convidado  | 2     | +30 dias                                  |
| Interno    | 1     | Alerta ao admin sobre membro em risco     |

### Motor

`supabase/functions/rescue-runner/index.ts` (cron diário `rescue-runner-daily`,
09h de Brasília):

- Seleciona elegíveis, respeitando `rescue_opt_out` e `rescue_paused_until`.
- Respeita o **orçamento diário** de e-mails (limite Resend de 300/dia menos a
  reserva para e-mails transacionais) e a janela de envio.
- Envia pelo provedor ativo em Configurações → Integrações e registra em
  `notification_dispatch_log`.
- Grava a jornada em `crm_lead_history` quando há lead associado.
- Aceita `{"dry_run": true}` para simulação.
- Autorização: service role / cron, ou usuário com papel `admin`.

`supabase/functions/rescue-optout/index.ts` — endpoint público (sem JWT) do link
"Não quero mais receber estes e-mails"; marca `rescue_opt_out = true` no perfil
ou no lead e cancela disparos agendados (LGPD).

## 4. Painel administrativo (v3.44.0)

`/admin/resgate` (`src/pages/AdminResgate.tsx`, apenas admin —
`canManageRescue` em `src/lib/access-control.ts`), com KPIs de fila, enviados,
falhas e cancelados/pulados, e quatro abas:

**Visão geral**
- Orçamento diário: usados nas últimas 24h, disponível para resgate, fila,
  vencidos e se o momento está dentro da janela de envio (via
  `rescue-runner` com `{"action": "status"}`).
- Configurações gravadas em `integration_settings` (categoria `rescue`):
  `daily_budget` (padrão 300), `transactional_reserve` (padrão 100),
  `send_days` (padrão ter/qua/qui), `send_hour_start`/`send_hour_end`
  (padrão 9h–11h de São Paulo), `whatsapp_number` e `enabled`.

**Pessoas**
- Lista agrupada por destinatário com público, etapa atual, quantidade de
  envios, último envio e próximo agendamento.
- Ações: "Enviar agora" (dispara o item da fila), "Pular etapa"
  (`status = skipped`, a régua segue para a próxima), "Pausar 30d"
  (cool-off via `rescue_paused_until`) e "Remover" (opt-out definitivo,
  cancelando os disparos agendados).

**Campanhas**
- Ativar/pausar por etapa e editar nome, atraso, assunto, introdução, corpo
  (editor de texto rico), bloco de oferta especial opcional, texto do botão e
  mensagem pré-preenchida do WhatsApp.
- Variáveis suportadas: `{{nome}}`, `{{grupo}}`, `{{dias_desde}}`.
- Preview do e-mail e envio de teste para qualquer endereço
  (`rescue-runner` com `{"action": "test", "campaign_id", "email"}`).

**Histórico**
- Filtros por público e status, com exportação Excel/PDF (`ExportButton`).
- Ações de envio imediato e cancelamento nos itens ainda na fila.

Execução manual: "Simular" (`dry_run`) monta a fila sem enviar; "Executar régua
agora" usa `force` e ignora a janela de envio.

### Controle do limite Resend (300/dia)

A Resend não expõe a cota restante. O contador local usa
`notification_dispatch_log` (envios com status `sent` nas últimas 24h). O
disponível para resgate é `daily_budget - transactional_reserve - usados`;
quando zera, os disparos permanecem `queued` e entram na execução seguinte.

## 5. Reativação

RPC `public.reactivate_member(_member_id, _team_id, _role)`:

- Exige grupo quando o papel de retorno é `membro` ou `facilitador`.
- Restaura `is_active`, o papel e o vínculo de grupo.
- Cancela disparos de resgate pendentes.

UI: diálogos de reativação em `/admin/membros` e `/admin/pessoas` com seleção de
papel e grupo.
