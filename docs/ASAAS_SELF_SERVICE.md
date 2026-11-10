<!-- @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte -->
# Assinaturas pelo Asaas

## Preparação v3.59.2 — 10/11/2026

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

**Ainda não habilite o envio de eventos no Asaas.** A implementação atual é apenas a
proteção inicial: responde 401 para autenticação incorreta e 503 quando não configurada
ou quando a autenticação é válida, pois o processamento financeiro ainda não foi
implantado. Nunca responde sucesso descartando eventos. Se houver configuração
antecipada, confira/reabilite a fila no Asaas antes da homologação.

## Próxima implementação

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

## Limitações atuais

O botão de contratação e a cobrança automática **ainda não foram implementados**.
O envio administrativo existente continua sendo um registro com e-mail, não uma
confirmação do Asaas. Não confundir atribuição administrativa com pagamento real.