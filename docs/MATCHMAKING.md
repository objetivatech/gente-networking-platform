# MatchMaking — Conexões, tentativas e fila de espera (v3.40.0)

Documento de referência da mecânica de MatchMaking do Gente Comunidade.

## Quem acessa

Membros, facilitadores e administradores (`canUseMatchmaking` em `src/lib/access-control.ts`).
Convidados não acessam. Admins não entram como sugestão e não pontuam.

## Sugestões

O score de afinidade continua sendo calculado no cliente (`src/hooks/useMatchmaking.ts`) a partir
de `what_i_do`, `ideal_client`, `business_segment` e `tags`, somado ao motor de oportunidades
determinístico em `src/lib/matchmaking-rules.ts`. Não há IA externa.

Ajuste da v3.40.0: cada tentativa de contato sem retorno reduz levemente o score exibido
(-5 por tentativa, no máximo -15), para que a listagem não fique travada nos mesmos perfis.

## Ações no card

1. **Agendar Gente em Ação** — envia solicitação (`meeting_requests`) e registra uma
   tentativa do tipo `schedule_request`.
2. **Já conectei** — abre o mesmo formulário do Gente em Ação (data, notas, foto opcional) e
   chama a RPC `create_matchmaking_check`, que cria o Gente em Ação (25 pts) e registra a
   conexão efetiva (+10 pts de MatchMaking no mês).
3. **Registrar tentativa de contato** — grava uma tentativa `manual` (contato fora da
   plataforma), sem pontuação.

## Contadores

Cada sugestão exibe:
- `Tentativas: N` — total de registros em `matchmaking_attempts` para aquela dupla.
- `Conexões: N` — total de registros em `matchmaking_connections` para aquela dupla.

## Fila de espera (60 dias)

- Apenas **conexões efetivas** colocam o contato em fila de espera.
- Durante 60 dias após a última conexão, o perfil sai da listagem e da "sugestão da semana".
- Vencido o prazo, o perfil volta às sugestões com o selo **Reconexão sugerida**.
- Tentativas nunca escondem o perfil.
- A RPC `create_matchmaking_check` valida a fila no banco e retorna a data de liberação caso
  o membro tente registrar antes do prazo.

## Pontuação nas reconexões

Uma nova conexão efetiva após os 60 dias pontua normalmente: 25 pts do Gente em Ação e
+10 pts de MatchMaking. O termo `matchmaking_count * 10` em `calculate_monthly_points_for_team`
conta as conexões do mês corrente, então reconexões em meses diferentes não duplicam pontos
de meses anteriores.

## Modelo de dados

`matchmaking_connections` (conexões efetivas)
- Restrição única `(member_id, target_id)` **removida** na v3.40.0 para permitir reconexões.
- Índice `(member_id, target_id, created_at DESC)`.

`matchmaking_attempts` (tentativas, sem pontos)
- `member_id`, `target_id`, `attempt_type` (`manual` | `schedule_request`), `notes`,
  `reference_id`, `created_at`.
- RLS: membro vê/cria/apaga as próprias; admin e facilitador leem todas.

RPCs
- `create_matchmaking_check(_target_id, _description, _meeting_date, _image_url)`
- `register_matchmaking_attempt(_target_id, _attempt_type, _notes, _reference_id)`
