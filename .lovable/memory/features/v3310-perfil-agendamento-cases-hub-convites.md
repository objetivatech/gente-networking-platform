---
name: v3.31.0 — Perfil, Agendamento com confirmação, Cases externos, Convites HUB
description: Perfil `max-w-6xl`; renomeia "Agendar 1x1"→"Agendar Gente em Ação" com fluxo de solicitação/confirmação em `meeting_requests` + emails; cases ganham `case_type` (plataforma|externo); convites ganham `invite_target` ('comunidade'|'hub') e aceite HUB cria lead no CRM (origem `convite_membro`).
type: feature
---

# v3.31.0

## Perfil (MemberProfile.tsx)
- Container ampliado para `max-w-6xl` para eliminar espaço em branco do desktop.
- Botão "Agendar 1x1" → "Agendar Gente em Ação" (agora recebe `recipientId`).

## Agendar Gente em Ação (fluxo com confirmação)
- Nova tabela `meeting_requests` (status: pending/confirmed/declined/cancelled) com RLS por participante.
- Hook `useMeetingRequests` (criar / responder / cancelar) + notificações via `activity_feed` e emails (`meeting_request`, `meeting_response`).
- `ScheduleMeetingDialog` agora envia solicitação (não abre calendário direto).
- Novo `MeetingRequestsPanel` (recebidas/enviadas) na aba **Agendamentos** do `Profile.tsx`. Google Calendar/.ics só aparecem após confirmação.
- Contador de pendentes recebidas na trigger da aba.

## Cases (Profile.tsx + useBusinessCases.ts)
- Coluna `case_type` ('plataforma' | 'externo'; default 'plataforma') em `business_cases`.
- Dialog de novo case com tabs; "externo" dispensa vínculo com `business_deals`.
- Badges na listagem: "Da plataforma" (primary) vs "Externo" (outline laranja).
- Migração: cases sem `business_deal_id` foram marcados como 'externo'.

## Convites — Comunidade vs Gente HUB
- Coluna `invite_target` em `invitations` ('comunidade' | 'hub').
- Enum `crm_lead_source` recebe valor `convite_membro`.
- `accept_invitation` RPC: quando `invite_target='hub'`, cria lead no CRM (source `convite_membro`, stage `novo`) em vez de perfil de comunidade — não cria acesso à comunidade.
- `Convites.tsx`: tabs "Comunidade" / "Gente HUB" no dialog; validações condicionais (HUB exige nome+email; comunidade exige grupo).
- Novo template de email `hub_invitation` (roteado em `send-email`).
- Badge "Gente HUB" laranja na lista de convites.

## Notas
- Migrações executadas nesta versão: `meeting_requests`, `business_cases.case_type`, `invitations.invite_target`, enum `crm_lead_source.convite_membro`, `accept_invitation` atualizada.
- Emails novos (`meeting_request`, `meeting_response`, `hub_invitation`) usam o wrapper existente com logo do Gente Networking.
- Pontuação: nenhuma nova pontuação é atribuída pelo agendamento (o registro efetivo do Gente em Ação continua sendo feito pelo fluxo existente após o encontro).
