# MatchMaking v3.40.0 — Marcar conexões, contadores e fila de 60 dias

## Objetivo

Hoje a aba "Já conectados" existe mas nada no MatchMaking permite marcar uma conexão: o único botão do card é "Agendar Gente em Ação", e o banco impede registrar a mesma dupla mais de uma vez (restrição única member_id + target_id). O resultado é a aba sempre vazia.

O ajuste entrega:
- Botão "Já conectei" em cada card da listagem (além do agendamento).
- Botão "Registrar tentativa" para contatos feitos fora da plataforma.
- Contadores por sugestão: tentativas e conexões efetivas.
- Fila de espera de 60 dias: só conexões EFETIVAS tiram o perfil da listagem; passados 60 dias ele volta a aparecer, marcado como "reconexão".

## Comportamento definido

- Uma nova conexão efetiva com a mesma pessoa após os 60 dias pontua normalmente (Gente em Ação 25 pts + 10 pts de MatchMaking).
- Contam como tentativa: cada solicitação "Agendar Gente em Ação" enviada e cada marcação manual "Registrar tentativa".
- Tentativas nunca escondem o perfil da listagem — apenas informam o contador e reordenam levemente (quem já teve tentativa sem retorno cai um pouco no ranking, para não travar a lista).

## Como fica a tela

Cada card de sugestão passa a exibir, abaixo das badges:
- `Tentativas: N` e `Conexões: N` (ocultos quando zero).
- Selo "Reconexão sugerida" quando já houve conexão efetiva e a espera de 60 dias venceu.
- Dois botões: "Agendar Gente em Ação" (atual) e "Já conectei" (abre o mesmo formulário de Gente em Ação já usado hoje: data, notas, foto), mais um link discreto "Registrar tentativa".

A aba "Já conectados" passa a listar as conexões efetivas com data, contador de encontros com aquela pessoa e a informação "disponível para nova sugestão em DD/MM" ou "disponível agora".

## Mudanças técnicas

Banco (migração):
1. Remover a restrição `UNIQUE (member_id, target_id)` de `matchmaking_connections` e criar índice `(member_id, target_id, created_at DESC)`. O histórico existente é preservado.
2. Nova tabela `matchmaking_attempts` (`id`, `member_id`, `target_id`, `attempt_type` = `schedule_request` | `manual`, `notes`, `reference_id`, `created_at`) com GRANTs para `authenticated`/`service_role`, RLS habilitada e políticas: membro vê/insere/apaga as próprias; admin e facilitador leem.
3. Ajustar `create_matchmaking_check` para deixar de bloquear quando já existe conexão com o mesmo alvo; em vez disso, bloquear apenas se houver conexão efetiva nos últimos 60 dias (mensagem clara de fila de espera). Mantém a criação do Gente em Ação, o insert da conexão, o feed e o recálculo de pontos.
4. Nova RPC `register_matchmaking_attempt(_target_id, _attempt_type, _notes)` (SECURITY DEFINER) para registrar tentativas sem pontuação.
5. `calculate_monthly_points_for_team` permanece igual: continua somando `matchmaking_count * 10` por mês, então uma reconexão em outro mês pontua sem duplicar o mês anterior.

Frontend:
- `useMatchmaking.ts`: buscar `matchmaking_connections` (todas as linhas, não só o target) e `matchmaking_attempts`; derivar por perfil `attemptsCount`, `connectionsCount`, `lastConnectionAt`, `cooldownUntil`, `isInCooldown`, `isReconnection`. Filtrar da listagem apenas quem está em cooldown; incluir quem já venceu a espera com o selo de reconexão. Novas mutations `createCheck` (existente) e `registerAttempt`.
- `Matchmaking.tsx`: contadores, selo de reconexão, botão "Já conectei" (reutilizando o diálogo de Gente em Ação), link "Registrar tentativa" e aba "Já conectados" com data de retorno à fila.
- `ScheduleMeetingDialog.tsx`: callback opcional `onScheduled` para que a página do MatchMaking registre a tentativa `schedule_request` quando o agendamento parte de um card. Nenhuma alteração de comportamento nos outros locais que usam o diálogo.
- `pickWeeklySuggestion` passa a ignorar perfis em cooldown (já ignora conectados hoje).

Documentação e changelog:
- Atualizar `docs/TECHNICAL_DOCUMENTATION.md` e `docs/USER_FLOWS.md` com a mecânica de fila, contadores e regras de pontuação.
- Inserir entrada `v3.40.0` em `system_changelog`.

## Não muda

Gamificação de Gente em Ação registrado fora do MatchMaking, regras de acesso (`canUseMatchmaking`), score de afinidade e o motor de oportunidades em `matchmaking-rules.ts`.
