---
name: v3.33.0 — Integração de leads, convites, privacidade e MatchMaking
description: Convites separados em Grupo Premium, evento HUB e Comunidade WhatsApp; LGPD reabrível; MatchMaking agenda antes de registrar; LPs rastreáveis no CRM.
type: feature
---

# v3.33.0

- Convites usam `invite_purpose`: `premium_group`, `hub_event`, `whatsapp_community` e `hub_legacy`.
- Eventos usam `event_type`: `premium_group` ou `hub_event`.
- Evento HUB exige evento futuro, cria/atualiza lead e vincula presença após aceite confirmado.
- Comunidade Gente direciona para a LP com `ref` e `convite`; não concede acesso à plataforma.
- Preferências LGPD permanecem acessíveis por botão flutuante após a decisão.
- MatchMaking abre solicitação de Agendar Gente em Ação; só o registro posterior do encontro pontua.
- LPs devem salvar as variáveis de produção e gerar novo build; falhas de sincronização não podem ser silenciosas.