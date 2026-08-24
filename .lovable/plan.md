# Correção de fluxo: convites, presença de convidados, desativação e duplicidade de leads

## 1. Atribuição errada do convite (Rafael → Eduardo)

Causa confirmada nos dados: existe um gatilho no cadastro (`handle_new_user_invitation_match`) que, ao criar o usuário, procura **qualquer convite pendente com o mesmo e-mail** (o mais recente) e o aceita — ignorando o código que a pessoa realmente usou. Como o Eduardo tem dezenas de convites pendentes criados por e-mail (fluxo HUB) e o convite do Rafael foi criado **sem e-mail**, o cadastro casa com o convite do Eduardo e o vínculo vai para ele.

Também confirmado: 3 pessoas hoje têm **dois convites aceitos** ao mesmo tempo (ex.: Pedro Scaramuzzi, aceito por dois convidadores diferentes).

Correção:
- O código do convite usado no cadastro passa a ter prioridade absoluta: se houver `invitation_code` nos metadados do usuário/localStorage, o gatilho não faz busca por e-mail.
- A busca por e-mail vira fallback restrito: só aceita quando o usuário ainda não tem nenhum convite aceito e quando existe apenas **um** convite pendente para aquele e-mail. Havendo mais de um, o convite fica pendente e aparece para o admin resolver.
- `accept_invitation` passa a ser idempotente por pessoa: se o usuário já tem convite aceito, novos aceites não sobrescrevem o vínculo original (apenas registram histórico).
- Higienização dos dados atuais: manter o convite aceito mais antigo por pessoa e marcar os demais como `superseded` no metadata, preservando todo o histórico.

## 2. Convidado não vê o evento para confirmar presença

Causa confirmada: `useGuestData` lê o convite aceito com `maybeSingle()`. Quem tem **dois** convites aceitos (situação criada pelo bug 1) recebe erro, o hook retorna vazio e nenhum encontro aparece. Há ainda 31 convites aceitos sem grupo e 7 sem o snapshot `allowed_team_ids`.

Correção:
- Trocar a leitura única pela lista de convites aceitos, unindo os grupos permitidos de todos eles (sem erro em caso de múltiplos).
- Quando o convite não tem grupo (HUB/legado), incluir também o evento vinculado (`event_id`) e os encontros do tipo Gente HUB, para o convidado confirmar presença mesmo sem grupo premium.
- Backfill do `allowed_team_ids` para os convites aceitos que estão sem snapshot, usando o grupo do convite ou o grupo do convidador.

## 3. Erro ao desativar convidado (`add_activity_feed ... does not exist`)

Causa confirmada: a função `deactivate_member` chama `add_activity_feed` com os parâmetros **fora de ordem** (passa o id no lugar do título). Como a chamada está dentro do bloco protegido, toda a desativação é revertida e o admin vê o erro do print.

Correção:
- Corrigir a ordem dos argumentos na `deactivate_member`.
- Blindar a `add_activity_feed`: o registro em feed nunca deve derrubar a operação principal (falha vira aviso, não erro).
- Auditoria: as demais funções que usam o feed foram verificadas e estão corretas — só a `deactivate_member` estava quebrada.
- Ajuste adicional: hoje `deactivate_member` recusa desativar admin, mas não trata convidado de forma específica; passa a aceitar convidado (remove vínculo/visibilidade e marca inativo) sem tentar rebaixar papel inexistente.

## 4. Duplicidade de membros que preenchem formulários das LPs

Recomendação (a implementar após sua validação):
- **Chave de identidade normalizada**: e-mail em minúsculas e telefone só com dígitos (com/sem DDI). O `submit-lead` passa a procurar, nessa ordem: perfil por e-mail → perfil por telefone → lead por e-mail → lead por telefone.
- Se casar com **membro ativo**: não cria convidado nem lead novo. O envio é registrado como "interação de membro" no lead existente (ou num lead vinculado ao perfil), com a origem da LP, e o CRM mostra o selo "já é membro" em vez de um card novo no funil.
- Se casar com **lead existente** (e-mail diferente, mesmo telefone): faz merge — atualiza dados, soma a página de origem e registra no histórico, sem criar card duplicado.
- **Fila de possíveis duplicados** no `/admin/crm`: casos com nome muito parecido mas contato diferente ficam numa aba para o admin unir com um clique (mesclar mantém histórico dos dois).
- Nas LPs: campo de telefone obrigatório e, se o e-mail já for de membro, mensagem "você já faz parte do Gente" com link de login — evita duplicidade na origem.

## Detalhes técnicos

- Migrações: reescrever `handle_new_user_invitation_match`, `accept_invitation` (idempotência por pessoa) e `deactivate_member` (ordem dos args); `add_activity_feed` com tratamento de exceção interno; scripts de limpeza dos convites duplicados e backfill de `allowed_team_ids`.
- Frontend: `src/hooks/useGuestData.ts` (lista de convites + união de grupos + eventos HUB por `event_id`); `src/pages/GuestWelcome.tsx` para exibir eventos sem grupo.
- Dedup: `supabase/functions/submit-lead/index.ts` (normalização + resolução por telefone), nova coluna de chave normalizada e índice em `crm_leads`, RPC de merge de leads, aba "Possíveis duplicados" em `src/pages/AdminCrm.tsx`.
- Documentação: `docs/INVITATION_FLOW.md`, `docs/FLUXOS_DE_CONVITES.md`, `docs/CRM_INGESTAO_LEADS.md` e entrada **v3.45.0** no `system_changelog`.

## Ordem de execução

1. Correções 1–3 (bugs em produção) e limpeza dos dados.
2. Dedup do item 4 após sua confirmação das regras (especialmente o comportamento quando o e-mail é de um membro ativo).
