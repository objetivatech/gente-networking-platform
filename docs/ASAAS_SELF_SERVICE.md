<!-- @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte -->
# Assinaturas pelo Asaas

## Implementação v3.60.0 — 10/11/2026

O Asaas foi escolhido para a contratação automática de Assinantes da Comunidade.
A chave `ASAAS_API_KEY` já está no Vault da Central de Integrações. Não é necessário
copiá-la para o chat, frontend ou criar outra chave. O resolvedor de serviço existente
reutiliza o Vault e, apenas como alternativa, os secrets das Edge Functions.

A configuração de pagamentos atualmente aponta para **produção**. O último teste
salvo foi positivo em 06/11/2026; não foi realizado novo teste da credencial nesta etapa.
Nenhuma cobrança, assinatura financeira ou alteração de papel foi criada.

## Proteção necessária

O token de autenticação de webhook é diferente da chave API. Cadastre-o pelo formulário
seguro e use o mesmo valor no campo de token de autenticação do webhook no painel Asaas.
O token deve chegar no cabeçalho `asaas-access-token` e fica disponível somente no serviço.

Endereço de preparação:
`https://vyfkddcbmwlwldaorxzy.supabase.co/functions/v1/asaas-webhook`

O token já foi salvo pelo formulário seguro. Configure o mesmo valor no painel Asaas.
O endereço agora processa pagamentos vinculados à contratação; responde 401 para
autenticação incorreta e 503 em falhas recuperáveis, sem confirmar eventos perdidos.
Eventos alheios às contratações deste módulo são ignorados sem alterar cobranças antigas.

### Configuração e homologação

1. Publique o frontend pelo fluxo GitHub → Cloudflare Pages.
2. Configure um webhook no ambiente correto do Asaas, com o endereço acima e o token
   de autenticação salvo. Selecione eventos de cobrança/pagamento (PAYMENT_CREATED,
   PAYMENT_UPDATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE,
   PAYMENT_REFUNDED, PAYMENT_DELETED e eventos de chargeback) e SUBSCRIPTION_DELETED.
   O token deve ser o mesmo do formulário seguro; nunca cole o valor no chat.
3. Confira a fila e retome eventos pausados, se houver configuração antecipada.
4. Faça homologação com conta autorizada e chave sandbox compatível antes de abrir vendas.
   A configuração atual é produção: não mudar o ambiente usando a mesma chave sem validar.
5. Admin → Planos e Assinaturas → editar plano → Oferecer contratação pública pelo Asaas.
   Apenas plano ativo mensal para Assinantes, em BRL, com preço positivo e sem modelo
   de contrato eletrônico vinculado é ofertado. Todos começam desabilitados, inclusive testes.

### Jornada do visitante

Página Assinantes → Assinar a Comunidade → `/assinar` no domínio da plataforma →
escolher plano → entrar ou criar conta → aceitar contratação mensal → informar CPF/CNPJ →
página segura do Asaas → pagar → voltar → Conferir pagamento → acessar plataforma.
Cartão não é capturado nem armazenado pela plataforma; Pix/cartão dependem das formas
disponíveis na fatura Asaas. Não afirmar que Pix é débito automático: cada ciclo exige
confirmação financeira. A oferta de cartão recorrente deve ser verificada na homologação.
O cadastro usa Supabase Auth sem criar convite ou presença; confirmação de e-mail segue
as configurações hospedadas, ainda não verificadas. Conta já existente deve entrar, não
ser duplicada. Perfil inativo ou assinatura administrativa existente exige revisão Admin.

O papel Assinante é concedido somente após pagamento confirmado da contratação consentida.
Cancelar encerra acesso e novas cobranças; perfil, papéis e histórico são preservados.
Convidados podem contratar; Membros/Facilitadores/Admins usam gestão administrativa e
não são convertidos por checkout. Nenhum Grupo Premium, ponto ou presença é criado.

## Regras implementadas

- Ofertar apenas planos selecionados explicitamente pelo Admin para contratação pública;
  não publicar automaticamente planos internos ou de teste.
- Identificar conta existente sem duplicá-la e exigir autenticação para alterar seu acesso.
- Cadastro e pagamento seguros, sem armazenar cartão na plataforma.
- Validar valor, ambiente e vínculo persistidos; retorno do navegador não comprova pagamento.
- Processar confirmação e repetição de eventos de forma transacional e idempotente.
- Conceder o papel Assinante somente na contratação explicitamente consentida, sem converter
  automaticamente Membros, Facilitadores ou Admins e sem conceder Grupo Premium/pontos.
- Controlar renovação e inadimplência sem excluir perfil/histórico.
- Homologar antes de habilitar ofertas reais; credencial sandbox ainda não verificada.

## Detalhes técnicos e limites

- `subscriber-checkout`: catálogo público limitado; start/status/cancel exigem conta
  confirmada. Valores e direitos vêm do plano salvo, nunca do navegador.
- `asaas_contracts`: vínculo, ambiente, consentimento e período pago; leitura própria/Admin.
- `asaas_payment_events`: eventos idempotentes; leitura Admin e escrita apenas serviço.
- `reserve_asaas_contract`: bloqueio de perfil, uma assinatura aberta e reserva de emissão.
  Tentativa de criação ambígua não é repetida: busca referência externa ou pede revisão.
- `apply_asaas_payment`: evento/cobrança/acesso numa transação. Valor divergente e papel
  interno/inativo são recusados para revisão. Webhook relê o estado real no Asaas.
- `asaas_subscription_current`: vigência derivada em catraca/entitlements/sorteios;
  expira na data do próximo ciclo em Brasília sem cron ou recargas automáticas.
- Conferir pagamento relê até 100 cobranças do vínculo no provedor. Não há fila de
  retry no navegador nem varredura periódica. Falhas de webhook são retomadas pelo Asaas.
- Cobranças administrativas/HUB antigas continuam no mecanismo anterior; não foram
  convertidas ou reenviadas. E-mails de cobrança recorrente dependem das notificações
  configuradas no Asaas; não foi adicionada automação nova de e-mail da plataforma.
- Pagamento real, cartão recorrente, entrega de mensagens e conta autenticada permanecem
  sem homologação neste Supabase externo. Nenhuma conta de teste ou cobrança foi criada.
- Segurança: nenhuma nova advertência após restringir catálogo ao serviço; 78 avisos
  anteriores permanecem fora do escopo desta rodada.