# MatchMaking — Conexões, tentativas, fila e franquia (v3.53.0)

Documento de referência da mecânica de MatchMaking do Gente Comunidade.

## Quem acessa

Membros, facilitadores, administradores e Assinantes da Comunidade (`canUseMatchmaking` em `src/lib/access-control.ts`). Convidados não acessam. Admins não entram como sugestão e não pontuam.

## Universo de perfis

A lista de perfis vem da RPC `get_matchmaking_profiles`, nunca de uma consulta ampla no cliente:

- Membro/Facilitador/Admin: perfis ativos, exceto Admins e o próprio usuário.
- Assinante: somente Assinantes e Convidados ativos (`is_showcase_profile`).
- Leads, cadastros pré-ativação e contatos do CRM nunca entram.

## Sugestão semanal e franquia mensal

A sugestão da semana é orgânica, determinística e **não consome franquia**.

Para Membros e Assinantes, as demais conexões são reveladas pelo botão **Sortear nova conexão**:

- Cada sorteio chama `draw_matchmaking_suggestion(_target_id)` e grava `usage_quota_events` com `feature_key = 'matchmaking_draw'`, mês corrente e `reference_id` do perfil.
- O mesmo contato não consome franquia duas vezes no mesmo mês.
- Planos ativos usam `billing_plans.features.matchmaking_monthly_quota`.
- Assinante sem assinatura ativa ou sem franquia configurada não sorteia.
- Membros ainda sem plano configurado mantêm o comportamento atual até a atribuição de planos da Fase 4.
- Admin/Facilitador mantêm visão gerencial completa e não consomem franquia.

## Sugestões e score

O score de afinidade continua no cliente (`src/hooks/useMatchmaking.ts`) a partir de `what_i_do`, `ideal_client`, `business_segment` e `tags`, somado ao motor determinístico em `src/lib/matchmaking-rules.ts`. Não há IA externa.

Cada tentativa sem retorno reduz o score exibido em 5 pontos, no máximo -15.

## Ações no card

1. **Agendar Gente em Ação** — envia solicitação (`meeting_requests`) e registra tentativa `schedule_request`. Após gravar, oferece WhatsApp, cópia da mensagem ou conclusão sem WhatsApp.
2. **Já conectei** — exclusivo de Membros/Facilitadores/Admins; chama `create_matchmaking_check`, cria Gente em Ação e registra conexão efetiva com pontos da mecânica.
3. **Registrar tentativa de contato** — grava tentativa `manual`, sem pontuação. Assinantes só podem registrar tentativas com perfis da vitrine.

## Contadores

Cada sugestão exibe `Tentativas: N` e `Conexões: N` para aquela dupla.

## Fila de espera (60 dias)

- Apenas conexões efetivas colocam o contato em fila de espera.
- Durante 60 dias, o perfil sai da listagem e da sugestão semanal.
- Vencido o prazo, volta com o selo **Reconexão sugerida**.
- Tentativas nunca escondem o perfil.

## Pontuação nas reconexões

Uma nova conexão efetiva após 60 dias pontua normalmente para Membros: 25 pts de Gente em Ação e +10 pts de MatchMaking. Assinantes não entram na gamificação de Membros.

## Modelo de dados

- `matchmaking_connections`: conexões efetivas; reconexões permitidas.
- `matchmaking_attempts`: tentativas sem pontos.
- `usage_quota_events`: consumo mensal dos sorteios extras.

## WhatsApp assistido

- Telefone lido do perfil e normalizado com DDI 55.
- Link `wa.me` abre somente após a solicitação e por ação explícita.
- `meeting_requests.whatsapp_opened_at` registra abertura, nunca envio, entrega ou leitura.

RPCs:

- `get_matchmaking_profiles()`
- `get_matchmaking_draw_state()`
- `draw_matchmaking_suggestion(_target_id)`
- `create_matchmaking_check(_target_id, _description, _meeting_date, _image_url)`
- `register_matchmaking_attempt(_target_id, _attempt_type, _notes, _reference_id)`

## v3.55.0 — Catraca e painel

`matchmaking_enabled` permite desligar o módulo independentemente de `matchmaking_monthly_quota`. Menu, rota e RPC aplicam o mesmo direito. Perfis elegíveis de score neutro permanecem candidatos (sem afirmar afinidade inexistente). Dashboard Assinante mostra saldo e atalho. Agendamento depende de `can_create_gente_em_acao`; Assinante não usa check nem histórico gamificado. A defesa no cliente rejeita candidatos Membro/Facilitador/Admin, além do isolamento no banco.
