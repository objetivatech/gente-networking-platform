<!-- @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte -->
# v3.64.3 — Gente Conexões, Fase 3

- Página `/conexoes` redesenhada a partir da referência Comunidade: imagem de encontro, benefícios, problema/solução, ecossistema, públicos, razões, ofertas e FAQ.
- Editor avançado da página existente ganha Problema, Para Quem, Depoimentos e Planos e contratação; conteúdo salvo e IDs permanecem. Entrada da plataforma mantém sua seleção de seções anterior.
- Depoimentos aparecem somente quando cadastrados; não foram publicados nomes, números de autoridade ou garantias promocionais inventados.
- Ofertas usam o catálogo público existente de `subscriber-checkout`: preço, módulos, franquia, selo, vagas e trial. Sem oferta publicada, a página informa indisponibilidade; sem vagas, não oferece contratação.
- Botão da oferta leva a `/assinar?plano=ID`, pré-selecionando somente um plano retornado pelo catálogo; servidor continua validando vagas, preço e consentimento.
- Catálogo compartilhado entre apresentação e checkout, com cache de um minuto e sem polling. Nenhuma conta, assinatura, plano ativo ou cobrança foi alterada.
- Rotas canônicas, redirecionamentos legados, SEO e PWA permanecem preservados.

Validação: 197 testes passaram; página pública desktop/mobile, imagens, login, redirecionamento legado e escolha do plano público existente conferidos sem cobrança, erros ou overflow. Publicação Cloudflare e homologação de edição/salvamento Admin no Supabase externo pendentes. Changelog versionado entregue com o código; `system_changelog` não foi alterado nesta rodada de apresentação.