# Plano v3.33.0 — Integração de leads, convites, privacidade e MatchMaking

## Diagnóstico confirmado

- O CRM contém **zero leads** das origens `lp_gentehub`, `lp_participe`, `lp_networking` e `site_elementor`; os 106 registros atuais vieram de convites manuais.
- A função `submit-lead` não recebeu chamadas nas consultas de logs disponíveis. Portanto, a interrupção acontece antes da gravação no CRM.
- As quatro LPs publicadas e o site WordPress carregam, mas nenhuma chamada ao `submit-lead` foi observada sem realizar uma submissão real.
- No print do Cloudflare, as variáveis estão preenchidas, porém a própria tela informa que a alteração só vale na **próxima implantação** e ainda exibe o botão **Salvar**. Como o Vite incorpora `VITE_*` durante o build, salvar e gerar uma nova implantação de produção é obrigatório.
- No projeto [LPs Gente](/projects/9079d17f-47e6-48cb-9834-62065bdce6f4), todos os formulários passam por `useCreateLead`; o encaminhamento ao CRM é secundário e silencioso. Se a sincronização externa falha, a LP informa sucesso porque o lead local continua sendo salvo.
- O WordPress depende do webhook do Elementor; a função já aceita formulário e está pública, mas o envio real ainda precisa ser capturado para confirmar URL, IDs e formato enviados pelo plugin.
- Os convites atuais misturam dois destinos internos: `comunidade` significa grupo premium e `hub` significa lead genérico. Não existe fluxo próprio para Comunidade Gente/WhatsApp nem vínculo do convite HUB com um evento.
- Os grupos existentes no banco são Gente Conecte, Gente Impulso e Gente Master.
- O banner LGPD persiste a decisão em `localStorage`, mas desaparece por completo depois da escolha e não oferece um meio de reabrir as preferências.
- Os dois CTAs do MatchMaking registram imediatamente Gente em Ação e pontos; não usam o fluxo confirmado de `meeting_requests`.

## 1. Restabelecer e comprovar a ingestão de leads

### LPs Gente

1. Salvar as variáveis no Cloudflare e executar nova implantação de produção do projeto LPs Gente.
2. Validar no bundle publicado se a URL de `submit-lead` e a rotina de sincronização foram incorporadas.
3. Fazer uma submissão controlada em cada rota (`participe`, `impulso`, `comunidade`, `gentehub`) e acompanhar a requisição até o CRM.
4. No projeto LPs Gente, substituir o comportamento silencioso por retorno observável: manter o lead local, registrar status/erro da sincronização e permitir reenvio, evitando perda invisível de integrações.
5. Preservar o mapeamento central de origens, diferenciando a LP Comunidade, os grupos premium e o Gente HUB em `source_detail`.

### WordPress/Elementor

1. Capturar uma submissão real em `https://gentenetworking.com.br/#participe` e confrontar URL, método, `Content-Type`, nomes dos campos e resposta HTTP.
2. Ajustar somente os aliases/formato realmente observados no `submit-lead`; manter validação Zod, CORS e `verify_jwt=false`.
3. Fazer o endpoint retornar detalhes úteis ao webhook e manter logs sem expor dados sensíveis.
4. Validar ponta a ponta com lead marcado como teste e remover o registro de teste ao final.

> Limitação operacional: este projeto só consegue ler o código de **LPs Gente**, não gravar nele. As mudanças desse repositório precisarão ser executadas ao abrir o projeto LPs Gente; aqui serão entregues o contrato de integração, o endpoint receptor e a validação do lado Comunidade. A configuração do Elementor também é feita no painel WordPress.

## 2. Reorganizar convites por destino real

Substituir a nomenclatura ambígua por três opções visíveis:

1. **Visitar um Grupo Premium**
   - Seleção obrigatória entre Conecte, Impulso e Master, usando os grupos reais do banco.
   - Mantém o fluxo de cadastro como `convidado`, vínculo ao grupo escolhido, visibilidade dos encontros e confirmação de presença.

2. **Participar de um Evento Gente HUB**
   - Seleção obrigatória de um evento HUB futuro.
   - Cria/atualiza lead no CRM com origem de convite de membro, registra o evento escolhido e preserva quem convidou.
   - O vínculo ao evento fica disponível para acompanhamento e presença após a identificação/cadastro, sem conceder acesso de membro premium.

3. **Entrar na Comunidade Gente (WhatsApp)**
   - Gera link rastreável para a LP Comunidade, com referência ao membro que convidou.
   - A LP cria/atualiza o lead no CRM e, após sucesso, apresenta o acesso ao grupo de WhatsApp já configurado nela.
   - Não cria usuário, role ou vínculo com grupo premium automaticamente.

### Compatibilidade e dados

- Adicionar um propósito de convite explícito e vínculo opcional com evento, sem apagar convites históricos.
- Migrar semanticamente os registros antigos: `comunidade` passa a ser exibido como **Grupo Premium**; convites `hub` antigos permanecem identificados como legado até receberem evento.
- Atualizar a validação/RPC de aceite, RLS, badges, filtros, textos, emails e CRM sem alterar históricos, pontos ou regras de acesso.
- Não usar `teams.is_hub`: hoje todos os três grupos existentes têm `is_hub=false`; eventos HUB terão classificação própria.

## 3. Tornar as preferências de cookies sempre acessíveis

- Manter a primeira exibição do banner e a persistência já existente.
- Após a escolha, exibir um botão flutuante discreto com ícone de cookie no canto inferior direito, com tooltip e rótulo acessível.
- Ao acioná-lo, reabrir as preferências, mostrar a decisão e data armazenadas, permitir alterar/revogar consentimento e acessar Política de Cookies/Privacidade.
- Respeitar safe areas e não sobrepor navegação mobile, PWA ou outros elementos fixos.
- Cobrir primeira visita, retorno, alteração de preferência e armazenamento indisponível.

## 4. Corrigir o fluxo do MatchMaking

- Trocar **“Conectar agora”** e **“Já conectei”** por uma ação coerente de **“Agendar Gente em Ação”**.
- Reutilizar `ScheduleMeetingDialog` com o membro sugerido já preenchido, criando uma `meeting_request` pendente.
- Preservar confirmação/recusa, feed, email e liberação de calendário somente após confirmação.
- Remover do MatchMaking o modal que cria imediatamente Gente em Ação, imagem, pontos e `matchmaking_connections`.
- O encontro só será pontuado e marcado como conexão concluída quando for posteriormente registrado no fluxo normal de Gente em Ação; agendar, por si só, não gera pontos.
- Manter a listagem histórica de conexões já registradas.

## 5. Documentação, testes e changelog

- Atualizar os guias de ingestão LP/WordPress, documentação interna de Convites, CRM, Gente HUB, Comunidade WhatsApp, MatchMaking e matriz de permissões.
- Adicionar testes para mapeamento de origens, três propósitos de convite, aceite e permissões, preferências LGPD e abertura do agendamento pelo MatchMaking.
- Executar testes de regressão em autenticação por convite, presença, CRM, gamificação, emails e responsividade.
- Registrar a versão **v3.33.0** no changelog somente após as verificações ponta a ponta.

## Ordem de execução

```text
Salvar + reimplantar LPs
        ↓
Provar LPs/WordPress → submit-lead → CRM
        ↓
Migrar e separar os 3 destinos de convite
        ↓
Adicionar preferências LGPD reabríveis
        ↓
Conectar MatchMaking ao agendamento confirmado
        ↓
Testes, documentação e changelog
```
