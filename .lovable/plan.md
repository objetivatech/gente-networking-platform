# MatchMaking — Conexões inteligentes entre perfis

## Diagnóstico (estado atual)

- O recurso **não existe** hoje: não há tela, rota, hook nem tabela de matchmaking.
- Os perfis (`profiles`) já têm campos ricos para cálculo de afinidade: `business_segment`, `tags[]`, `what_i_do`, `ideal_client`, `how_to_refer_me`, `bio`, `company`, `position`.
- `gente_em_acao` registra reuniões 1x1 e já vale **25 pts** (via `calculate_monthly_points_for_team`).
- Pontuação mensal é calculada por grupo em `calculate_monthly_points_for_team` e recalculada por gatilhos. Qualquer nova pontuação deve ser somada **lá dentro** para não quebrar o ranking.
- Admin e facilitador **não pontuam** (regra mantida).

## Decisões confirmadas com você

- **Critério do match:** combinação — cruza `ideal_client` × (`what_i_do` + `business_segment` + `tags`) E afinidade por tags/segmento, gerando um score único.
- **Pontos:** o check cria o registro de Gente em Ação (25 pts) **e** soma **+10 pts** de bônus de MatchMaking. Total efetivo: 35 pts.
- **Alcance:** sugestões de toda a plataforma (membros e convidados), sem restrição de grupo.
- **Exclusivo para MEMBROS** (e admin/facilitador para visualização), nunca para convidados.

## Como o match é calculado

Para o membro logado, percorre todos os perfis ativos (membros + convidados, exceto ele mesmo e admins) e atribui um **score de afinidade**:

```text
+40  termos do "meu cliente ideal" aparecem no "o que faço"/segmento/tags do outro (e vice-versa)
+25  tags em comum (peso por nº de tags coincidentes)
+15  mesmo segmento de negócio (oportunidade de parceria/complementaridade)
+10  campos de perfil bem preenchidos do outro lado (qualidade do match)
```

Ordena por score decrescente e mostra os melhores. Matching feito por normalização de texto (minúsculas, sem acento) e interseção de palavras‑chave — sem IA externa, 100% determinístico e barato.

## Banco de dados (migration)

### 1. Tabela `matchmaking_connections`
Registra cada "check" que o membro dá em um contato abordado.

- `member_id` (quem deu o check)
- `target_id` (pessoa conectada)
- `description` (texto curto do que houve)
- `gente_em_acao_id` (FK para o registro 1x1 gerado)
- `year_month` (para pontuação mensal)
- `id`, `created_at`

Estrutura na ordem obrigatória: CREATE TABLE → GRANT (authenticated/service_role) → ENABLE RLS → POLICIES.

RLS:
- Membro vê/insere apenas os próprios checks (`member_id = auth.uid()`).
- Admin/facilitador podem ler (para estatísticas), via `has_role`.
- Unicidade `(member_id, target_id)` para evitar check duplicado no mesmo contato.

### 2. RPC `create_matchmaking_check(_target_id, _description, _meeting_date)`
`SECURITY DEFINER`, em transação única:
1. Valida que o caller é `membro` (ou admin/facilitador — mas só membro pontua).
2. Cria o registro em `gente_em_acao` (meeting_type conforme role do alvo: `membro` se o alvo é membro, senão `convidado` usando o nome do alvo) — reutiliza a mecânica existente que já dá os 25 pts.
3. Insere em `matchmaking_connections` ligando ao `gente_em_acao_id`.
4. Recalcula pontos do mês via `update_all_monthly_points_for_user`.
5. Registra no `activity_feed` (`activity_type = 'matchmaking'`).

### 3. Integrar o bônus de +10 pts
Em `calculate_monthly_points_for_team`, adicionar um termo:

```text
+ (nº de matchmaking_connections do usuário no mês, naquele grupo) * 10
```

Mantém o padrão dos demais termos (verifica vínculo do usuário ao grupo). Isso preserva 100% das mecânicas atuais — é uma soma adicional, nada é alterado nos cálculos existentes.

### 4. Linter Supabase
Rodar `supabase--linter` após a migração e corrigir avisos introduzidos.

## Frontend

### Hook `useMatchmaking.ts`
- Busca perfis (reaproveita lógica de `useMembers`/`get_guests_directory`), calcula scores no cliente, retorna sugestões ordenadas.
- Marca quais já receberam check (join com `matchmaking_connections`).
- Mutation `createCheck` chamando `rpc('create_matchmaking_check')`; invalida `gente-em-acao`, `monthly-ranking`, `matchmaking`, `activity-feed`.

### Página `Matchmaking.tsx` (rota `/matchmaking`)
- Cards de sugestão com nome, empresa, segmento, tags em comum e selo de afinidade.
- Botão **"Já conectei"** → dialog com campo de descrição (obrigatório) e data → cria o check (Gente em Ação + 10 pts).
- Aba/seção "Já conectados" listando os checks com a descrição.
- **Aviso de perfil incompleto:** banner no topo orientando completar o perfil (`what_i_do`, `ideal_client`, `tags`, `business_segment`) para participar do MatchMaking, com link para `/perfil`. Membros com perfil incompleto não entram como candidatos de match para os outros.

### Navegação e acesso
- Item no `Sidebar.tsx`: ícone `Sparkles`/`HeartHandshake`, label **"MatchMaking"**, roles `['admin','facilitador','membro']`.
- Rota lazy em `App.tsx`.
- Nova função em `src/lib/access-control.ts`: `canUseMatchmaking(role) = admin|facilitador|membro` + teste de regressão em `access-control.test.ts`.

## Documentação e changelog

- `ScoringRulesCard.tsx`, `Index.tsx` e `Documentacao.tsx`: adicionar a regra "MatchMaking — +10 pts por conexão realizada".
- `docs/TECHNICAL_DOCUMENTATION.md`: documentar tabela, RPC e integração de pontos.
- `.lovable/memory/features/matchmaking.md`: contrato da RPC, fórmula de score e regra dos +10 pts.
- `system_changelog`: nova entrada **v3.11.0** categoria `feature`.

## Validação final

- `bun run test` (access-control + hooks).
- Teste manual: membro com perfil completo vê sugestões; dá um check → cria Gente em Ação, ganha 25+10 pts no ranking, contato aparece em "já conectados"; convidado **não** acessa a tela; membro com perfil incompleto vê o aviso.

## Resultado esperado

- Membros ganham uma ferramenta de descoberta de conexões baseada nos perfis, exclusiva para eles.
- Cada conexão concretizada vira Gente em Ação + bônus de 10 pts, totalmente integrada à gamificação existente, sem quebrar nenhum cálculo atual.
