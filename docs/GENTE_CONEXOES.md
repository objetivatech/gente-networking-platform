<!-- @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte -->
# Gente Conexões — manual consolidado e aceite

**Fechamento documental da Fase 5:** 14/11/2026 · versão 3.64.5.

A Fase 5 do pacote atual é documentação e changelog, não uma nova implantação comercial. As funcionalidades das Fases 1–4 estão implementadas; a liberação operacional depende dos testes reais abaixo. Nenhuma oferta será ativada, conta alterada ou cobrança emitida por este fechamento.

## Onde encontrar

| Recurso | Local | Quem utiliza |
|---|---|---|
| Apresentação e ofertas | `/conexoes` | Público; condições vêm dos planos publicados |
| Contratação existente ou nova | `/assinar` | Pessoa autenticada, com consentimento explícito |
| Conteúdo da apresentação | Admin → LPs → LPs Avançadas → Gente Conexões | Admin |
| Preços, módulos, franquia, vagas, selos e trial | `/admin/planos` | Admin |
| Vídeo obrigatório | `/admin/acolhimento` | Admin configura; Gente Conexões assiste |
| Agenda | Início e `/encontros` | Conforme papel; Conexões confirma somente com convite específico, inclusive HUB |
| Vitrine Gente Conexões | `/vitrine` | Conforme plano/papel; Convidado não acessa |
| Guia contextual | Botão Guia no cabeçalho | Todos os papéis nas páginas autorizadas |
| Perfil e completude | `/perfil` | Cada pessoa edita seu perfil |
| Contratações abandonadas / pendentes | Aba própria em `/admin/crm` e `/admin/planos` | Somente Admin |
| Histórico de versões | `/changelog` | Conforme autorização existente |
| Documentação administrativa | `/documentacao` | Conforme autorização existente |

`/assinantes` e `/lps/assinantes` continuam redirecionando para `/conexoes`. O nome comercial mudou; o papel técnico `assinante`, contas, registro do CMS e checkout foram preservados. Grupos Premium exigem contratação independente.

## Primeiro acesso e continuidade

```text
Entrar na plataforma
  → vídeo obrigatório, se configurado e ainda não concluído
  → aviso de perfil, somente se faltarem campos
      → Completar perfil agora: abrir /perfil
      → Lembrar mais tarde ou fechar: liberar somente este instante
  → guia da página, quando ainda não visto neste navegador
  → navegação normal e reabertura pelo botão Guia
```

- Vídeo tem conclusão persistida por pessoa/versão no servidor; trocar arquivo ou duração exige nova conclusão. Alterar título não reinicia. Não habilitar antes de validar o arquivo definitivo.
- Completude usa os 12 campos reais, incluindo Portas que abro, Portas que procuro e observações. Pitch por IA é opcional. Novas pendências ou um perfil completo que volte a ficar incompleto fazem o aviso reaparecer; a tarja permanece fora de vídeo/diálogos enquanto faltarem campos.
- Desde 3.64.7, o aviso reaparece a cada abertura, retorno ou recarregamento, inclusive na mesma página, sem memorizar dispensa. A página do perfil fica livre do aviso automático para permitir edição; após salvar todos os campos, o aviso para. Remover informação obrigatória reativa a cobrança nas demais páginas.
- Guia é orientação local, não liberação de acesso, conclusão de vídeo ou gamificação. Vídeo, menu e outros diálogos suspendem sua abertura.

## Gestão comercial segura

- Plano, assinatura e papel são informações diferentes. Acesso depende da vigência e dos recursos autorizados; não promover pessoas por uma edição genérica de assinatura.
- Vagas consideram assinaturas ativas, pendentes e em atraso, inclusive reservas. Esgotamento bloqueia novas contratações, sem mudar preço ou cancelar contratos automaticamente.
- Trial é configurável por plano, de 1 a 30 dias (padrão 7), uma vez por pessoa e somente após consentimento e vínculo no Asaas. Não concede papel interno ou pontos.
- Selos acompanham assinatura vigente, sem exposição de informações financeiras. Sugestão semanal de MatchMaking não consome a franquia de sorteios extras.
- Recuperação lista contratações sem primeiro pagamento há mais de 24 horas; exclui trial, pagamento anterior, conta inativa, assinatura ativa/cancelada/concluída e processamento em andamento. O total representa essa população elegível, não todos os visitantes que abriram a página de vendas.
- Retomar contato permite editar a mensagem e abrir WhatsApp manualmente. Não registra envio automático, não cria cobrança nem muda CRM, papel ou pontos.

## Checklist de aceite operacional — ainda pendente

Registrar data, conta autorizada, resultado e evidência de cada teste; não marcar aprovado somente por testes simulados.

| Verificação | Resultado esperado | Dependência |
|---|---|---|
| Publicação Cloudflare e páginas públicas | `/conexoes` abre; URLs antigas preservam parâmetros; login chega à plataforma; OG/canônico corretos; sem aviso PWA nas LPs | Publicação externa do frontend e Pages Functions |
| Editor Admin | Editar/salvar/reabrir conteúdo e conferir página pública; demais LPs e entrada não mudam | Conta Admin autorizada |
| Vídeo Conexões | Pausar/retomar, sair/entrar, concluir e trocar versão; não contar aba oculta nem liberar por erro | Vídeo definitivo e conta Conexões |
| Avisos e guia | Nos cinco papéis: incompleto → modal → fechar → guia; nova abertura/retorno/mesma URL/recarregamento reabre; edição livre; completo sem modal; limpar campo reativa; sem sobreposição | Contas autorizadas por papel |
| Vitrine e MatchMaking | Convidado bloqueado por URL/consulta; Conexões não vê Membros/Facilitadores/Admins; extra consome franquia, semanal não | Plano e contas autorizadas |
| Agenda e convites | Conexões vê futuros, só confirma com convite específico, inclusive HUB; reconvite não promove; CRM/cards não duplicam | Admin/Facilitador e evento autorizado |
| Contratação e trial | Consentimento, reserva, primeira cobrança, webhook, liberação, vencimento e cancelamento sem duplicar ou estender trial | Asaas e cenário autorizado de teste |
| Vagas e selos | Esgotamento impede nova contratação; reserva é contada; selo só na vigência | Plano de teste autorizado |
| Recuperação | Admin vê total/lista coerentes; não Admin recusado; WhatsApp revisável, sem envio/cobrança automática | Contratação de teste elegível >24h |
| Histórico | Versões 3.64.0–3.64.5 aparecem uma vez em `/changelog` | Publicação e conta autorizada |

## Evidências e limites

- Consulta ao Supabase em 14/11/2026 confirmou um registro de cada versão 3.64.0–3.64.5 em `system_changelog`; não foi necessária nova migração.
- A rodada 3.64.5 teve 222 testes aprovados e build OK. Isso não substitui aceite autenticado, entrega real de e-mails, pagamento ou conferência da publicação externa.
- Ofertas Fundador/Regular foram preparadas inativas; revisar o estado atual e condições antes de liberar. Nenhuma ativação integra esta Fase 5.
- Alertas preexistentes de segurança permanecem fora deste pacote; não tratá-los como corrigidos pelo fechamento documental.

Referências: [Documentação técnica](./TECHNICAL_DOCUMENTATION.md), [Fluxos](./USER_FLOWS.md), [Changelog 3.64.5](./CHANGELOG_3.64.5.md), [Asaas](./ASAAS_SELF_SERVICE.md), [LPs e Asaas](./HOMOLOGACAO_LPS_ASAAS.md).