---
name: Convites, participações, CRM e ciclos de Resgate v3.50.0
description: Convite inicial reutilizável/renovável, visitas recorrentes separadas, presença real no CRM e ciclos de Resgate com Ex-Convidado distinto
type: feature
---

- Convite pendente válido é reutilizado e pode ser reenviado; vencido é renovado com novo código e `renewal_of_id`.
- Admin, Facilitador e Membro ativos não recebem outro convite de ativação.
- Convidado ativo recebe nova `guest_participation`, sem conta, presença, pontos ou promoção automáticos.
- Convites Premium criam/atualizam CRM imediatamente; aquisição original não é substituída pela pessoa que convida para uma visita posterior.
- CRM conta encontros distintos e guarda primeira/última presença, unindo presença com conta e de lead sem conta.
- Resgate usa ciclos reiniciáveis, separa `ex_convidado` de `ex_membro` e cancela só itens futuros quando há retorno.
- Acesso legado por convites aceitos permanece como fallback durante a transição.