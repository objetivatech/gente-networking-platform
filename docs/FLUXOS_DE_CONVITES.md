# Fluxos de Convites

**Versão:** v3.33.0 · Agosto/2026

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
`source_detail=comunidade_whatsapp`. Esse fluxo não cria conta ou papel na plataforma.

## Compatibilidade histórica

- Convites antigos `comunidade` são apresentados como Grupo Premium.
- Convites antigos `hub` sem evento são mantidos como Gente HUB legado.
- Nenhum histórico, aceite, presença, atividade ou pontuação foi apagado.
## Integridade do vínculo (v3.45.0)

- Um convidado tem **um único** convite aceito válido. Aceites adicionais ficam marcados como
  `superseded` no metadata, sem apagar histórico.
- O código usado no cadastro define o convidador. O match automático por e-mail só ocorre quando
  existe um único convite pendente para o endereço e a pessoa ainda não tem convite aceito.
- Convidados sem grupo (Gente HUB) visualizam o evento do convite e os encontros `hub_event`
  abertos para confirmar presença.
