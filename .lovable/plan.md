## Objetivo

Quando o membro clica em **"Já conectei"** no MatchMaking, o formulário deve ter os mesmos campos de registro do **Gente em Ação**, já que a conexão é gravada como um Gente em Ação. A única diferença é o bônus de **+10 pontos** por ser via MatchMaking. O registro independente de Gente em Ação (fora do MatchMaking) continua existindo sem alterações.

## Diferenças atuais

Formulário do Gente em Ação tem: contato, **data da reunião**, **notas (opcional)** e **foto do encontro (opcional, comprimida e enviada ao bucket `gente-em-acao`)**.

Diálogo "Já conectei" do MatchMaking hoje tem apenas: data + descrição (obrigatória). Não permite foto e a descrição é exigida.

## Mudanças

### 1. Banco — RPC `create_matchmaking_check`
Adicionar o parâmetro `_image_url text DEFAULT NULL` e gravá-lo na coluna `image_url` do `gente_em_acao` (tanto no ramo de membro quanto no de pessoa externa). Manter toda a lógica existente (criação do `matchmaking_connections`, activity feed, recálculo de pontos com o +10). A descrição passa a ser opcional (já usa `COALESCE(_description, 'Conexão via MatchMaking')`), alinhando ao comportamento de notas opcionais do Gente em Ação.

### 2. Frontend — `src/pages/Matchmaking.tsx` (diálogo "Já conectei")
Substituir o formulário atual por um que reproduz os campos do Gente em Ação para um contato já conhecido:
- Cabeçalho/leitura do contato selecionado (já temos `selected.full_name`, empresa, avatar) — não precisa de seleção de membro/convidado, pois o alvo já está definido pela sugestão.
- **Data da reunião** (já existe).
- **Notas (opcional)** — renomear o campo "O que houve nessa conexão? *" para "Notas (opcional)", deixando de ser obrigatório, igual ao Gente em Ação.
- **Foto do encontro (opcional)** — mesmo seletor de imagem com preview, compressão e upload no bucket `gente-em-acao`.
- Banner informando o bônus de **+10 pts** do MatchMaking (manter).

Para evitar duplicação do código de compressão/upload de imagem (hoje embutido em `GenteEmAcao.tsx`), extrair `compressImage` e a função de upload para um util compartilhado (ex.: `src/lib/image-upload.ts`) e usar nos dois lugares.

### 3. Frontend — `src/hooks/useMatchmaking.ts`
Atualizar `createCheck` para aceitar e repassar `imageUrl` ao RPC (`_image_url`). O upload da imagem é feito no cliente antes de chamar o RPC (mesma mecânica do Gente em Ação), e o botão de confirmar deixa de exigir descrição.

## Detalhes técnicos

- Bucket de storage `gente-em-acao` exige caminho iniciando com `user.id` (RLS) — o upload no MatchMaking usa o id do membro logado, então funciona normalmente.
- Nenhuma mudança no fluxo de Gente em Ação independente: a página `GenteEmAcao.tsx` continua permitindo registrar reuniões sem passar pelo MatchMaking.
- O `useMatchmaking` já invalida as queries de `gente-em-acao`, ranking e pontos após o check.

## Validação

- Registrar uma conexão via "Já conectei" com foto e sem notas → confirmar criação do `gente_em_acao` com `image_url` preenchido, do `matchmaking_connections`, e do bônus de +10 pts no recálculo.
- Registrar via Gente em Ação normal → continua somando os 25 pts sem o bônus de MatchMaking.
