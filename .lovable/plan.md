# v3.31.0 — Perfil do Membro & Convites Gente HUB

## 1. Layout do Perfil do Membro (largura total)

**Arquivo:** `src/pages/MemberProfile.tsx`

- Trocar `max-w-4xl mx-auto` por `max-w-6xl mx-auto` (consistente com `Profile.tsx` conforme memória v3.20.0).
- Reorganizar o card de perfil: no desktop (`md:`), transformar o bloco de bio/tags/contatos em `grid md:grid-cols-3` para que "O que eu faço / Cliente Ideal / Como me indicar" (aba "Sobre") ocupe a largura total abaixo do avatar, e a bio se expanda ao lado da foto em vez de deixar espaço em branco.
- Mover a bio (`member.bio`) para a coluna lateral direita da foto, preenchendo o vazio identificado no print.

Escopo puramente visual — sem mudança de dados.

## 2. Agendar Gente em Ação (com confirmação)

### Renomeação
- `src/components/ScheduleMeetingDialog.tsx`: trocar rótulo do botão "Agendar 1x1" por **"Agendar Gente em Ação"** e ajustar títulos internos do diálogo.
- Mesmo ajuste onde o componente é referenciado em `MemberProfile.tsx` e `Profile.tsx`.

### Fluxo de confirmação (novo)
Hoje o botão gera imediatamente um link do Google Calendar / `.ics`. Vamos introduzir uma etapa de **solicitação → confirmação** antes de liberar o convite:

**Nova tabela `meeting_requests`** (migration):
- `id`, `requester_id` (uuid → profiles), `recipient_id` (uuid → profiles)
- `proposed_start` (timestamptz), `duration_minutes` (int), `location` (text), `message` (text)
- `status` enum: `pending` | `confirmed` | `declined` | `cancelled`
- `responded_at`, `created_at`, `updated_at`
- RLS: requester e recipient podem SELECT; requester pode INSERT/DELETE (cancelar); recipient pode UPDATE (aceitar/recusar).
- GRANTs conforme padrão (authenticated + service_role).

**Fluxo novo no diálogo:**
1. Solicitante preenche data/hora/duração/local/mensagem e clica **"Enviar solicitação"** (substitui os botões atuais de Google/.ics).
2. Sistema insere em `meeting_requests` (status `pending`) e:
   - Cria entrada no `activity_feed` para o destinatário (notificação in-app).
   - Dispara email via edge function existente `send-email` ("Fulano quer agendar um Gente em Ação com você").
3. Destinatário vê a solicitação em **nova seção no `Feed.tsx`** (card "Solicitações de Gente em Ação pendentes") com botões **Confirmar** / **Recusar**.
4. Ao confirmar:
   - Status → `confirmed`.
   - Retorna ao solicitante os botões **"Google Calendar"** e **"Baixar .ics"** (lógica atual do `scheduling-utils.ts` reaproveitada) via nova aba "Meus agendamentos" no perfil OU via link no email de confirmação.
   - Email para o solicitante avisando que foi aceito.
5. Ao recusar: status → `declined`, notificação para o solicitante.

**Novo hook:** `src/hooks/useMeetingRequests.ts` (list, create, respond, cancel).

**Nova aba no perfil próprio:** "Agendamentos" em `Profile.tsx` listando pendentes/confirmados (enviados e recebidos).

Nenhuma pontuação é atribuída (o registro de "Gente em Ação" na tabela `gente_em_acao` continua manual — apenas oferece um botão "Registrar como Gente em Ação" no card do agendamento confirmado).

## 3. Cases externos (não vinculados a negócios)

**Migration mínima em `business_cases`:**
- Adicionar coluna `case_type` text com default `'externo'` e check em (`'plataforma'`, `'externo'`).
- Backfill: linhas com `business_deal_id IS NOT NULL` → `case_type = 'plataforma'`; demais → `'externo'`.
- Ajustar trigger/constraint que hoje força `business_deal_id NOT NULL` (referência memória "business-cases-intent") para exigir vínculo **apenas** quando `case_type = 'plataforma'`.

**UI:**
- `useBusinessCases.ts`: aceitar/salvar `case_type` no `createCase`.
- Formulário de criação de case (em `Profile.tsx` — aba Cases): toggle "Case da plataforma (vinculado a negócio)" vs "Case externo". Quando "plataforma", exige seleção de `business_deal_id` (dropdown com `business_deals` do usuário). Quando "externo", libera `client_name` livre.
- Exibição em `MemberProfile.tsx` (aba Cases) e `Profile.tsx`: badge distintivo:
  - `plataforma` → Badge verde "Fechado no Gente"
  - `externo` → Badge secundária "Case externo"

## 4. Convites para o Gente HUB

Hoje `invitations` liga o convidado a um `team_id` (grupo do Gente Comunidade). Para o **Gente HUB** (produto separado, servido pelo CRM/leads), a mecânica precisa se diferenciar:

**Migration em `invitations`:**
- Nova coluna `invite_target` text com check em (`'comunidade'`, `'hub'`), default `'comunidade'`.
- `team_id` passa a ser **nullable** e obrigatório apenas quando `invite_target = 'comunidade'` (constraint condicional).
- Backfill: tudo existente → `'comunidade'`.

**Fluxo do convite Gente HUB:**
- Ao aceitar um convite `invite_target = 'hub'`, em vez de criar profile + team_member, o handler (`AuthConfirm.tsx` ou RPC atual `accept_invitation`) cria um registro em **`crm_leads`** com:
  - `origin = 'convite_membro'` (nova origem), `status = 'novo'`
  - `referred_by_user_id = invitations.invited_by`
  - Dados básicos (nome/email/phone) preenchidos do convite/cadastro.
- Convidado NÃO vira usuário da plataforma via esse fluxo — cai no CRM para o admin qualificar e rodar o fluxo de contrato/cobrança do HUB (já existente em v3.25.0).

**UI em `Convites.tsx`:**
- Adicionar `RadioGroup` no diálogo: **"Convidar para"** → `Gente Comunidade (grupo)` | `Gente HUB (produto premium)`.
- Se **Comunidade**: mantém o `Select` de grupo (obrigatório).
- Se **HUB**: esconde grupo, mostra campos obrigatórios (nome + email + telefone) e um textarea opcional "Contexto para o time comercial".
- Badge diferenciada na lista: "Comunidade" (padrão) vs "HUB" (laranja/destaque).
- Stats atualizadas para separar contagens por destino.

**Referência cruzada CRM:**
- No `LeadDrawer.tsx`, quando o lead veio de `origin = 'convite_membro'`, mostrar quem indicou (link para o perfil do membro).
- Recompensa/pontuação para o indicador **fica fora deste escopo** — pode ser proposto em uma iteração seguinte.

## 5. Documentação & Changelog

- Nova memória: `.lovable/memory/features/v3310-perfil-agendamento-cases-hub-convites.md` com resumo dos 4 blocos.
- Atualizar `docs/INVITATION_FLOW.md` com a variante Gente HUB.
- Atualizar `docs/CRM_INGESTAO_LEADS.md` adicionando origem `convite_membro`.
- Inserir entrada `v3.31.0` em `system_changelog` (via `supabase--insert`) com as 4 mudanças listadas.

## Detalhes técnicos

- Migrations agrupadas em uma única chamada `supabase--migration` cobrindo: `meeting_requests` + coluna `case_type` + coluna `invite_target` + ajuste da constraint de `business_cases` + ajuste no RPC `accept_invitation` para bifurcar em `crm_leads` quando `invite_target = 'hub'`.
- Envios de email reusam `supabase/functions/send-email/index.ts` com novos templates em `_shared/email-templates.ts` (`meetingRequestEmail`, `meetingConfirmedEmail`, `hubInviteEmail`).
- Notificações in-app via `activity_feed` (padrão já usado por Pedidos de Indicação — memória v3.19.0).
- Nenhum recurso existente é removido; todas as mudanças são aditivas com defaults preservando comportamento atual dos dados legados.

## Pontos a confirmar antes de implementar

1. **Ao confirmar um agendamento**, você prefere que o **próprio sistema** já anexe o convite `.ics` no email de confirmação (mais automático) OU que ambos os lados baixem/abram manualmente pelos botões (mais simples)?
2. **Convite Gente HUB**: o email/telefone devem ser obrigatórios (para virar lead) ou opcionais como no convite de Comunidade? Recomendo obrigatórios.
3. **Case externo**: ao adicionar, quer permitir upload de imagem/logo do cliente (já suportado por `image_url`) ou manter só texto nesta primeira iteração?
