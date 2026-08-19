---
name: Desativação com perda de acesso e Central de Resgate v3.43.0
description: Membro desativado perde acesso, sai do grupo e vira convidado; régua automática de e-mails de resgate (ex-membros/convidados) com rescue_campaigns/rescue_dispatches, edge functions rescue-runner e rescue-optout, e painel /admin/resgate
type: feature
---

- `deactivate_member`: desativa perfil, remove de `team_members`, rebaixa para `convidado`, despublica perfil público, cria/atualiza lead de ex-membro no CRM e agenda a régua.
- Acesso: helper SQL `is_active_user()` + guarda em `MainLayout.tsx` (tela "Acesso desativado" com CTA WhatsApp 55 51 2165-2325).
- `reactivate_member(_member_id, _team_id, _role)` exige grupo para membro/facilitador; diálogos atualizados em `/admin/membros` e `/admin/pessoas`.
- Régua: `rescue_campaigns` (conteúdo/cadência) + `rescue_dispatches` (fila única por destinatário+etapa). Ex-membro 60/+45/+30 dias; convidado 30/+30 dias; alerta interno de membro em risco.
- `rescue-runner` (cron diário `rescue-runner-daily`, 12:00 UTC) respeita orçamento diário do Resend (300/dia menos reserva transacional), janela de envio, `rescue_opt_out` e `rescue_paused_until`; aceita `dry_run`; autoriza service role/cron ou admin.
- `rescue-optout` público (sem JWT) para LGPD.
- Painel `/admin/resgate` (`canManageRescue` = apenas admin) com KPIs, edição de campanhas e fila.
- Documentação: `docs/RESGATE_E_REATIVACAO.md`. Changelog v3.43.0 registrado.
