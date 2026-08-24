---
name: Correções de convites e desativação (v3.45.0)
description: Prioridade do código de convite no cadastro, unicidade do convite aceito, convidado vendo encontros HUB e correção do add_activity_feed em deactivate_member
type: feature
---
- `handle_new_user_invitation_match`: usa `raw_user_meta_data.invitation_code` primeiro; match por e-mail só quando existe **exatamente um** convite pendente e a pessoa não tem convite aceito.
- `accept_invitation` é idempotente por pessoa: mantém o vínculo original e marca o convite extra com `metadata.superseded = true`.
- `useGuestData` lê **todos** os convites aceitos (nunca `maybeSingle`), une `allowed_team_ids`, inclui `event_id` e mostra `hub_event` abertos para convidado sem grupo.
- `deactivate_member` tinha os argumentos de `add_activity_feed` fora de ordem (erro `does not exist`) — corrigido; `add_activity_feed` agora captura exceções (`RAISE WARNING`) e nunca derruba a operação chamadora. Convidado pode ser desativado (`source_detail = 'ex_convidado'`).
- Pendente (aguardando validação): deduplicação de leads/membros vindos das LPs por e-mail+telefone normalizados.
