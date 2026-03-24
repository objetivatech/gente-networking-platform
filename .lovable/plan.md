
## Plano de Correção Efetiva — Confirmação de Email + Eventos do Convidado

### Diagnóstico confirmado

Há dois problemas principais, ambos reais e com causa raiz identificada.

#### 1) Confirmação de email do convidado está quebrada
Hoje o fluxo de cadastro do convidado faz três coisas erradas ao mesmo tempo:

1. **Aceita o convite cedo demais**  
   Em `src/pages/CadastroConvidado.tsx`, a função `accept_invitation` é chamada logo após o `signUp`, antes da confirmação do email.  
   Efeito:
   - o convite deixa de estar `pending`
   - o usuário ainda pode ficar com email não confirmado
   - se a confirmação falhar/expirar, o convite já foi “consumido”

2. **Não existe um callback real para concluir a verificação**  
   O `signUp` usa `emailRedirectTo: "/"` em `src/contexts/AuthContext.tsx`.  
   Quando o usuário clica no link do email, o app cai na rota principal/login, mas **não há uma página dedicada para processar o retorno da confirmação** (`token_hash`, `type=signup`, code/session exchange etc.).

3. **O comportamento atual mascara o erro**  
   O usuário volta ao login e recebe “confirme seu email”, porque o app não finalizou corretamente a sessão/validação do link.  
   Os logs confirmam isso:
   - `/verify` ocorreu
   - depois houve `email link has expired`
   - e em seguida `400: Email not confirmed`

#### 2) Eventos não aparecem para convidados já validados
No fluxo atual de `src/hooks/useGuestData.ts` há fragilidades reais:

1. **Os encontros dependem dos grupos atuais do convidador**
   O hook busca os grupos em `team_members` do `invited_by`.  
   Se o convidador não tiver grupo no momento, mudou de grupo, ou foi um perfil sem vínculo atual, o convidado fica sem encontros.

2. **O filtro de data exclui encontros de hoje**
   O código usa:
   `isFuture(parseLocalDate(m.meeting_date))`
   Como a data vira meia-noite local, um encontro “hoje” passa a não ser futuro e some da tela.  
   Isso explica convidados sem encontros mesmo havendo reunião no dia.

3. **A regra de visibilidade do convite não está congelada**
   O sistema deveria depender do contexto do convite aceito, não apenas do estado atual do `team_members` do convidador.

---

## Solução proposta

### Frente 1 — Reestruturar o fluxo de confirmação do convidado

#### A. Criar callback público de autenticação
Adicionar uma rota pública dedicada, por exemplo:
- `/auth/confirm`

Essa página será responsável por:
- processar o retorno da confirmação de email
- trocar/validar a sessão do link
- identificar `type=signup` / tokens do Supabase
- concluir o fluxo antes de redirecionar o usuário

#### B. Mudar o redirect do cadastro
No cadastro de convidado, o `signUp` deve usar:
- `emailRedirectTo = /auth/confirm?invite=CODIGO`

Assim o código do convite acompanha o fluxo de confirmação.

#### C. Aceitar o convite só depois da confirmação real
Mover a chamada de `accept_invitation` para o callback de confirmação, e somente quando:
- houver sessão válida
- o usuário estiver autenticado
- a confirmação tiver sido concluída com sucesso

Resultado:
- convite só é consumido quando o usuário realmente confirmou o email
- elimina o estado quebrado “convite aceito + email não confirmado”

#### D. Tornar o fluxo idempotente
O callback deve tratar com segurança:
- clique repetido no link
- refresh da página
- callback reaberto
- convite já aceito pelo mesmo usuário

A função SQL `accept_invitation` deve ser ajustada para:
- aceitar repetição segura do mesmo usuário/código
- não falhar se o convite já estiver aceito por aquele mesmo usuário
- retornar estado claro para o frontend

#### E. Melhorar UX de erro
Se o link estiver expirado ou inválido:
- mostrar tela dedicada explicando o motivo
- oferecer ação objetiva:
  - “Solicitar novo convite” ou
  - “Entrar com outro email” / contato com o convidador

Nada de cair silenciosamente na tela de login.

---

## Frente 2 — Corrigir a origem dos encontros visíveis do convidado

### A. Parar de depender apenas do grupo atual do convidador
Persistir no convite aceito os grupos permitidos para aquele convidado.

Proposta:
- gravar em `invitations.metadata` algo como `allowed_team_ids`
- preencher isso no momento da criação do convite ou no aceite
- usar esse snapshot como fonte principal no `useGuestData`

Isso torna o fluxo estável mesmo se:
- o convidador mudar de grupo
- o convidador ficar sem vínculo
- o convite tiver sido criado por admin/facilitador

### B. Backfill dos convites já aceitos
Criar migration para preencher `allowed_team_ids` nos convites já aceitos com base no melhor dado disponível hoje:
- grupos atuais do `invited_by`
- e, se necessário, regras de fallback para não deixar convidados sem contexto

### C. Corrigir filtro de data
Trocar o filtro atual por lógica que inclua encontros de hoje:
- `meeting_date >= current_date`
ou equivalente no frontend com `isToday || isFuture`

Isso corrige o sumiço dos eventos no próprio dia do encontro.

### D. Ajustar o hook `useGuestData`
O hook passará a:
1. buscar o convite aceito do usuário
2. ler `allowed_team_ids` do convite
3. listar encontros desses grupos
4. incluir encontros de hoje e futuros
5. manter status de presença corretamente

### E. Melhorar estado vazio
Quando não houver encontros, a mensagem deve distinguir:
- sem grupos vinculados ao convite
- sem encontros agendados para os grupos
- convite aceito, mas aguardando agenda

Hoje tudo vira “nenhum encontro agendado”, o que dificulta suporte.

---

## Ajustes técnicos complementares

### 1. Revisar `AuthContext`
Manter a restauração de sessão robusta e garantir que o callback de confirmação não dependa de corrida entre:
- `onAuthStateChange`
- `getSession`
- redirecionamento do `MainLayout`

### 2. Não redirecionar cedo demais no cadastro do convidado
Hoje `CadastroConvidado` faz:
- se `user`, `navigate('/')`

Com callback novo, o redirecionamento pós-confirmação deve ser controlado para não “atropelar” a conclusão do aceite do convite.

### 3. Ajustar login/mensagens
A tela de login deve orientar corretamente quando o problema for:
- email ainda não confirmado
- link expirado
- convite já consumido sem confirmação
- conta criada mas sem conclusão do aceite

---

## Arquivos impactados

### Frontend
- `src/contexts/AuthContext.tsx`
- `src/App.tsx`
- `src/pages/CadastroConvidado.tsx`
- novo callback público, ex.: `src/pages/AuthConfirm.tsx`
- `src/hooks/useGuestData.ts`
- possivelmente `src/pages/Auth.tsx`
- possivelmente `src/pages/ConvitePublico.tsx`

### Banco / regras
- migration para ajustar `accept_invitation`
- migration para backfill de `invitations.metadata.allowed_team_ids`
- opcionalmente trigger/função para garantir snapshot de grupos no convite

### Documentação
- `docs/USER_FLOWS.md`
- `docs/TECHNICAL_DOCUMENTATION.md`
- `/documentacao`
- changelog

---

## Ordem de implementação

1. Criar callback público de confirmação
2. Alterar redirect do signup de convidado para o callback
3. Mover `accept_invitation` para depois da confirmação efetiva
4. Tornar `accept_invitation` idempotente
5. Persistir `allowed_team_ids` no convite
6. Backfill dos convites aceitos existentes
7. Corrigir `useGuestData` para usar snapshot do convite
8. Corrigir filtro para incluir encontros de hoje
9. Melhorar estados de erro/vazio nas telas públicas
10. Atualizar documentação e changelog

---

## Resultado esperado após a correção

### Fluxo 1 — Novo convidado
- recebe convite
- cadastra conta
- recebe email
- clica no link
- confirmação conclui corretamente
- convite é aceito somente nesse momento
- usuário entra no sistema sem cair em loop de login

### Fluxo 2 — Convidado já validado
- acessa a área de convidado
- vê os encontros corretos do contexto do convite
- inclusive encontros de hoje
- consegue registrar presença normalmente

---

## Observação importante
O problema não é pontual; ele é de arquitetura do fluxo atual.  
A correção efetiva exige tratar **cadastro**, **confirmação de email** e **aceite do convite** como etapas separadas, com estado consistente entre frontend e banco. Só ajustar mensagens ou mexer no formulário não resolve de forma definitiva.
