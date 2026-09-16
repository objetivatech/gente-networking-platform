# Plano v3.48.0 — Base unificada de convidados e ativação por origem

## Diagnóstico confirmado

- Os quatro papéis do sistema estão corretos: **Administrador, Facilitador, Membro e Convidado**.
- “Gente HUB”, “Impulso”, “Comunidade”, “Participe” e “Site” não devem virar novos papéis. Eles representam a **origem e o contexto de entrada**; após ativar o acesso, a pessoa recebe o papel **Convidado**.
- Hoje, o recebimento das LPs já cria um contato no CRM e um convite pendente, mas **não cria perfil nem papel de Convidado antes da ativação**. A página **Convidados** consulta perfis/usuários com convite aceito, por isso os contatos ainda pendentes não aparecem nela.
- No banco atual há **83 usuários Convidados**. Também há **70 contatos ativos do CRM sem perfil**, dos quais **46 vieram das LPs/site**: 11 do Gente HUB, 34 de Participe/Impulso/Comunidade e 1 do site. Todos esses 46 já possuem convite relacionado.
- “Impulso” já chega, principalmente, como detalhe da origem `lp_participe`; portanto, hoje ele não é distinguido como categoria própria de onboarding.
- O e-mail disparado pelas LPs é atualmente um convite genérico. O histórico registra 64 envios concluídos e 1 erro nesse contexto.

## Fluxo proposto

```text
Cadastro em LP/site
        ↓
Identidade única por e-mail OU telefone
        ↓
Contato entra no CRM e na base unificada de Convidados
(status: cadastro recebido, ainda sem acesso)
        ↓
E-mail imediato e personalizado pela origem
        ↓
Pessoa cria senha e confirma o e-mail
        ↓
Perfil ativado com papel Convidado e acesso restrito
        ↓
Participação e acompanhamento
        ↓
Promoção segura para Membro quando houver adesão
```

A conta autenticada não será criada silenciosamente pela LP. O contato passa a integrar a base de convidados imediatamente, mas o acesso só nasce depois que a própria pessoa confirma o e-mail e define a senha.

## Implementação

### 1. Padronizar origem e jornada do convidado

- Manter os quatro papéis existentes e criar uma classificação de onboarding separada do papel:
  - Gente HUB;
  - Impulso;
  - Comunidade;
  - Participe;
  - Site;
  - Outra origem, como fallback automático.
- Resolver a categoria usando `source`, página e detalhes já recebidos, preservando também os dados originais para auditoria.
- Tratar “Impulso” como categoria própria mesmo quando a LP continuar enviando `lp_participe`.
- Registrar estados claros da jornada: **Cadastro recebido**, **Convite enviado**, **Aguardando ativação**, **Convidado ativo**, **Já participou** e **Promovido a membro**.
- Separar a origem técnica da atribuição humana para que um cadastro de LP não seja apresentado como convite pessoal de um administrador aleatório.

### 2. Tornar a entrada idempotente e segura

- Consolidar CRM, convite e identidade numa operação transacional do banco: a mesma submissão por e-mail ou telefone deve reutilizar o contato e o convite existentes.
- Preservar a regra atual de identidade única e o histórico de fusões; nunca apagar contatos, presenças ou dados comerciais.
- Se já houver usuário Convidado, vincular o contato ao perfil existente sem criar novo convite ou papel.
- Se já houver Membro, Facilitador ou Administrador ativo, manter o bloqueio `already_member` e oferecer login.
- Se houver convite pendente ou cadastro aguardando confirmação, reutilizar o mesmo convite e permitir reenvio controlado, sem duplicar registros.
- Validar a atribuição de indicação recebida das LPs; IDs externos não poderão atribuir convites livremente a qualquer membro.
- Aplicar proteção contra abuso e limite por destinatário/origem no envio automático, mantendo a experiência imediata escolhida.

### 3. Unificar a página Convidados

- Evoluir a consulta da página para reunir, sem duplicidade:
  - contatos captados ainda sem conta;
  - convites enviados/pendentes;
  - usuários com papel Convidado;
  - convidados que já participaram;
  - pessoas promovidas a Membro, preservadas como histórico.
- Adicionar filtros por **origem**, **estado da jornada**, **Grupo** e período, além da busca existente.
- Exibir origem, data de entrada, situação do convite/ativação, participações e vínculo ao CRM.
- Disponibilizar ações administrativas de reenviar ativação, abrir contato no CRM e promover pelo fluxo já existente.
- Aplicar visibilidade segura: Admin vê toda a base; Facilitador vê registros relacionados aos seus Grupos; Membros continuam vendo somente convidados já ativados e adequados ao networking. Cadastros brutos de LP não terão seus dados pessoais expostos a todos os membros.

### 4. Criar onboarding por origem

- Criar e-mails próprios para Gente HUB, Impulso, Comunidade, Participe e Site, mais um modelo genérico para novas origens.
- Cada mensagem explicará o contexto correto do cadastro e terá um único botão para ativar o acesso como Convidado.
- Reutilizar a identidade visual e a infraestrutura de e-mail existentes, com registro de enviado, erro, reenvio e ativação.
- O envio será imediato para novos cadastros válidos, conforme definido.
- Falha de e-mail não perderá o contato: ficará visível na base com estado de erro e opção de reenvio.
- Novas páginas continuarão sendo descobertas automaticamente; origens desconhecidas usarão o modelo genérico sem interromper a captação.

### 5. Migrar com segurança os registros existentes

- Classificar os contatos atuais sem perfil usando origem, detalhe e URL já armazenados.
- Vincular identidades que já possuam perfil/usuário antes de criar qualquer novo convite.
- Reaproveitar os convites existentes dos 46 contatos de LP/site sem perfil; não gerar duplicatas.
- Não reenviar em massa e-mails que já constem como entregues. Registros sem envio válido ou com erro entrarão numa fila administrativa de reenvio controlado.
- Produzir um relatório de migração com totais por origem, vinculados, pendentes, erros e possíveis conflitos para revisão do Admin.

### 6. Garantir a evolução para Membro

- Reutilizar o fluxo administrativo já existente de promoção para Membro, preservando CRM, histórico, presenças, contratos e relacionamento com a origem.
- Exigir Grupo de destino e validações comerciais necessárias antes da promoção.
- Registrar na auditoria quem promoveu, quando, origem inicial e estado anterior/novo.
- Garantir que o papel Convidado seja substituído corretamente, sem papéis conflitantes.

### 7. Auditoria, métricas e operação

- Ampliar a auditoria do CRM com eventos de cadastro recebido, convite enviado, falha de envio, reenvio, ativação e promoção.
- Incluir indicadores por origem: cadastros, ativações, pendências, participação e conversão para Membro.
- Permitir identificar rapidamente convites expirados, e-mails com erro e contatos sem Grupo quando o fluxo exigir Grupo.

## Detalhes técnicos e segurança

- A base de CRM continuará sendo o registro pré-ativação; `profiles` e `user_roles` somente serão criados após confirmação da identidade.
- As consultas unificadas serão feitas por função segura no banco, com retorno de campos diferente conforme o papel do usuário; dados pessoais pré-ativação não serão expostos por leitura direta.
- Toda alteração estrutural terá permissões explícitas e RLS. Operações de ativação, vinculação e promoção serão atômicas e auditáveis.
- O recebimento público das LPs continuará aceitando JSON, formulário e Elementor, mas terá validação de categoria, idempotência, proteção contra abuso e atribuição segura.
- A integração das LPs externas deverá enviar `source`, `source_detail`, `page_url` e, quando disponível, o contexto do produto. O projeto da plataforma aceitará formatos antigos durante a transição.

## Testes e validação

- Testar cada origem: HUB, Impulso, Comunidade, Participe, Site e fallback.
- Testar deduplicação por e-mail e telefone, inclusive e-mails diferentes com o mesmo telefone.
- Testar contato novo, Convidado existente, convite pendente, conta aguardando confirmação e Membro existente.
- Testar os cinco e-mails, fallback, erro e reenvio sem duplicidade.
- Testar ativação completa: LP → CRM/base de convidados → confirmação → papel Convidado → presença → promoção para Membro.
- Testar RLS e visibilidade para Admin, Facilitador, Membro e Convidado.
- Revalidar os fluxos já sensíveis: convite pessoal, presença em evento, downgrade/desativação, resgate, cobrança HUB, contratos e gamificação.
- Atualizar documentação de CRM, convites, identidade única e fluxos de usuário; incluir entrada no changelog v3.48.0.

## Critérios de aceite

- Todo cadastro válido de LP/site aparece imediatamente na base unificada de Convidados, com origem e estado corretos.
- Nenhuma submissão cria conta com acesso sem confirmação do titular.
- Uma mesma pessoa não gera contatos, convites ou papéis duplicados por e-mail ou telefone.
- O e-mail correto é enviado imediatamente segundo a origem, com fallback para novas páginas.
- Após ativação, a pessoa possui somente o papel Convidado e segue o acesso restrito desse papel.
- A promoção para Membro preserva integralmente histórico, CRM, presença e origem.
- Dados pré-ativação ficam restritos à gestão autorizada.
