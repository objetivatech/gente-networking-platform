# Fluxos de Convites

**Versão:** v3.56.0 · Outubro/2026

## Fluxo enxuto de convites (v3.56.0)

1. O link `/convite/:codigo` abre uma **página única**: foto e nome de quem convidou, Grupo,
   data/horário/local do próximo encontro e o formulário (nome, e-mail, WhatsApp, empresa,
   segmento, senha). O link antigo `/convite/:codigo/cadastrar` redireciona para ela.
2. "Confirmar minha vaga" chama a função `complete-guest-signup`, que cria a conta **já
   confirmada** (sem 2º e-mail), aceita o convite e confirma a presença no próximo encontro do
   Grupo (ou no evento Gente HUB do convite). O convidado entra logado na plataforma.
3. E-mail já cadastrado: a pessoa é orientada a entrar na conta existente; nada é sobrescrito.

### Reconvite por papel

| Papel | Quem pode reconvidar | Para quais encontros |
|---|---|---|
| Membro | Apenas os próprios convidados (`/convites`) | Encontros dos Grupos em que participa |
| Facilitador | Convidados visíveis em `/convidados` | Encontros do Grupo que facilita |
| Admin | Qualquer convidado | Qualquer encontro da rede |

O reconvite (`reinvite_guest_to_meeting`) registra uma `guest_participations` com
`status=invited` e devolve a mensagem pronta para WhatsApp. **A autoria continua com quem
convidou primeiro** (`invited_by` original), portanto os 15 pontos de presença seguem para esse
membro. Não cria conta, presença nem promoção. O Admin também pode mover a presença de um
convidado para encontro de **outro Grupo** (`move_guest_attendance`); o Facilitador segue
limitado ao próprio Grupo.

## Destinos disponíveis

### Visitar um Grupo Premium

O membro escolhe Conecte, Impulso ou Master. O convidado cria a conta com papel de
`convidado`, mantém vínculo de visibilidade com o grupo selecionado e pode confirmar presença
nos encontros permitidos. O convite não transforma o visitante em membro.

### Participar de um Evento Gente HUB

O convite exige um encontro futuro marcado como `hub_event`. Após confirmação de email, o
aceite cria ou atualiza o lead no CRM com origem `convite_membro`, registra o evento no lead e
vincula a presença. Não concede acesso premium nem pontos pelo simples aceite.

### Entrar na Comunidade Gente (WhatsApp)

O link abre a LP Comunidade com `ref` (membro que convidou) e `convite` (código rastreável).
A LP envia o lead ao CRM com `source=lp_participe` e
`source_detail=comunidade_whatsapp`. O fluxo cria ou reutiliza um convite de ativação,
mas não cria conta ou papel silenciosamente. A própria pessoa define a senha e confirma
o email antes de receber o papel `convidado`.

## Entrada pelas páginas e pelo site (v3.48.0)

Gente HUB, Impulso, Comunidade, Participe e Site são contextos de entrada, não novos papéis.
Cada cadastro recebe imediatamente um email adequado ao contexto e entra na base unificada
com seu estado de jornada. Novas origens usam automaticamente o texto genérico.

```text
LP/site → CRM + convite pendente → email por origem → ativação voluntária
→ Convidado com acesso restrito → participação → promoção para Membro
```

Repetições por email ou telefone reutilizam o contato e o convite válidos. Um identificador
de convidador vindo diretamente de formulário público é ignorado; somente um código de
convite válido pode estabelecer esse vínculo.

## Compatibilidade histórica

- Convites antigos `comunidade` são apresentados como Grupo Premium.
- Convites antigos `hub` sem evento são mantidos como Gente HUB legado.
- Nenhum histórico, aceite, presença, atividade ou pontuação foi apagado.

## Convite, renovação e nova participação (v3.50.0)

Antes de criar um convite manual, a plataforma procura a pessoa por email e telefone:

1. **Convite pendente e válido:** reutiliza o código; a ação **Reenviar** não altera a validade.
2. **Convite vencido:** a ação **Renovar** encerra o anterior, cria um novo código e mantém a
   referência entre ambos.
3. **Convidado com acesso ativo:** não cria outra conta nem convite de ativação; registra uma
   nova participação no Grupo ou encontro.
4. **Admin, Facilitador ou Membro ativo:** bloqueia um novo convite de ativação.

Convites manuais de Grupo Premium passam a criar ou atualizar imediatamente a ficha no CRM.
As participações recorrentes ficam em `guest_participations`, ligadas à pessoa, ao Grupo ou
encontro, ao convidador daquela visita e ao convite de origem. A atribuição de aquisição original
é preservada. Participação, confirmação e presença são estados diferentes: registrar uma
participação não concede pontos, não promove a pessoa e não confirma presença automaticamente.

Durante a transição, o acesso do Convidado considera primeiro as participações e mantém os
convites aceitos antigos como fallback. Assim, nenhum acesso histórico é retirado.
## Integridade do vínculo (v3.45.0)

- Um convidado tem **um único** convite aceito válido. Aceites adicionais ficam marcados como
  `superseded` no metadata, sem apagar histórico.
- O código usado no cadastro define o convidador. O match automático por e-mail só ocorre quando
  existe um único convite pendente para o endereço e a pessoa ainda não tem convite aceito.
- Convidados sem grupo (Gente HUB) visualizam o evento do convite e os encontros `hub_event`
  abertos para confirmar presença.
