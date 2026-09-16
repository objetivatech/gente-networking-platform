# Fluxos de Convites

**Versão:** v3.48.0 · Setembro/2026

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
## Integridade do vínculo (v3.45.0)

- Um convidado tem **um único** convite aceito válido. Aceites adicionais ficam marcados como
  `superseded` no metadata, sem apagar histórico.
- O código usado no cadastro define o convidador. O match automático por e-mail só ocorre quando
  existe um único convite pendente para o endereço e a pessoa ainda não tem convite aceito.
- Convidados sem grupo (Gente HUB) visualizam o evento do convite e os encontros `hub_event`
  abertos para confirmar presença.
