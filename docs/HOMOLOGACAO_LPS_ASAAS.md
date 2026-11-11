/**
 * @copyright Ranktop
 * Roteiro de homologação das LPs unificadas e da contratação Asaas.
 */
# Homologação — LPs e Asaas (11/11/2026)

## Verificado automaticamente
- LPs respondem 200 em `lps.gentenetworking.com.br`; `/assinantes` com título/imagem próprios.
- `asaas-webhook` recusa chamadas sem token (401).
- `subscriber-checkout` responde; lista pública de planos vazia.

## Bloqueios encontrados
1. Imagem/título de compartilhamento das LPs ainda são os da plataforma → publicar a versão atual no Cloudflare Pages (projeto unificado) e conferir imagem OG em cada LP no CMS.
2. Nenhum plano liberado para venda → em `/admin/planos`, ativar "Oferecer contratação pública pelo Asaas" num plano mensal de Assinante.
3. Webhook no painel Asaas com o mesmo `ASAAS_WEBHOOK_TOKEN` salvo.

## Roteiro manual
- LP: enviar formulário com e-mail de teste → lead no CRM, e-mail de ativação ao lead, aviso aos admins, conversão `lp_<slug>` no RD, redirecionamento configurado.
- Reenvio com mesmo e-mail/telefone → sem duplicata no CRM.
- Sem aviso de instalação do app nas LPs.
- Asaas: `/assinar` com conta nova → plano → pagamento (Pix de menor valor ou sandbox) → papel Assinante, Vitrine e MatchMaking liberados; cancelar e conferir fim de acesso na data do ciclo.
