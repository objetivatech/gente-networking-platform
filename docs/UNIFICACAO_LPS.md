# Unificação LPs → Plataforma — v3.52.0

**Estado: integração de código iniciada; virada pública NÃO realizada.**

## Entregue nesta etapa

- Gerenciador Admin em `/admin/lps`, com editor de blocos original, configurações, duplicação completa transacional, LPs avançadas, mídia e auditoria.
- Código isolado; mesmo login e cliente Supabase da plataforma. Sem importar papéis ou sessões do outro projeto.
- Tabelas compatíveis: `landing_pages`, `page_blocks`, `advanced_page_content`, `media_library`, `block_audit_logs`.
- Leitura pública somente de páginas ativas, blocos visíveis e conteúdo de páginas ativas. Gestão exclusiva de Admin, validada pelo banco.
- `/auth` apresenta a página `entrada-plataforma` editável no gerenciador. Login e recuperação disponíveis. Cadastro aberto removido da interface; cadastro por convite e confirmação preservados. Isso NÃO equivale a desabilitar signup no serviço Supabase.
- Os novos formulários usam `submit-lead` diretamente: sem banco paralelo, sem fila de dados pessoais no navegador, sem segundo disparo de e-mail. `409 already_member` não gera conversão nem reenvio. Mensagens de ativação usam o domínio Cloudflare da plataforma.
- GTM original `GTM-WHK29D6` preservado; nenhum Pixel Meta adicional. Eventos de conversão não enviam e-mail/empresa ao dataLayer. Auditar consentimento e tags do GTM antes da virada.
- HTML editorial sanitizado; sem importar bootstrap que promove usuários automaticamente a Admin.

## Inventário de URLs a preservar

| URL pública existente | Tratamento |
| --- | --- |
| `https://lps.gentenetworking.com.br/` | Mapear para página `inicio` após importar; conteúdo atual não está no novo banco |
| `/gentehub` | Preservar comportamento específico de evento, contador e WhatsApp |
| `/participe` | Preservar formulário e blocos específicos |
| `/comunidade` | Preservar modelo avançado e conteúdo JSON completo |
| `/impulso` | Preservar slug, formulário, origem e conteúdo importado |
| `/obrigado?source=...` | Preservar parâmetros, mensagens e redirecionamento |
| Demais slugs publicados/inativos | Importar inventário autorizado; não inferir registros do snapshot |

Domínio canônico das LPs: `https://gentenetworking.com.br`. Canonical da entrada da plataforma: `https://comunidade.gentenetworking.com.br/auth`. O domínio raiz NÃO deve ser apontado inteiro para a plataforma: preservar site/WordPress e suas outras páginas.

## Bloqueadores antes da virada

1. **Exportação do projeto LPs:** esta conversa não tem acesso ao banco do outro projeto. Abrir o chat de LPs Gente e solicitar exportação de TODAS as linhas de `landing_pages`, `page_blocks`, `advanced_page_content`, `media_library` e `block_audit_logs` em CSV, mantendo UUIDs e JSON; exportar `leads` separadamente para reconciliação. Enviar os arquivos aqui. Não exportar credenciais ou auth.users.
2. **Objetos de mídia:** exportar arquivos efetivos do Storage e seus caminhos. Reescrever URLs dentro de HTML, JSON, logos e OG. As duas imagens apontadas do código foram transferidas para este projeto; isso não transfere a biblioteca do banco. Imagens reais do snapshot foram copiadas, preservando conteúdo.
3. **Armazenamento público:** criação de bucket público recusada por `public_buckets_blocked`. `lps-media` é privado; Admin pode armazenar/visualizar imagens, mas o seletor impede publicar links temporários. Autorizar buckets públicos nas configurações de privacidade do workspace para concluir esse caminho. Não contornar usando buckets de perfis ou outro serviço.
4. **Cloudflare:** associar subdomínio ao projeto unificado SOMENTE depois dos testes e da importação. A função de roteamento é opt-in via `LP_UNIFIED_ENABLED=true`; mantém o caminho visto pelo visitante e separa tráfego público do domínio autenticado. Até lá, não alterar DNS nem desativar projeto LPs.
5. **SEO servido no HTML:** validar canonical, OG, schema e sitemap para todas as LPs, incluindo compartilhadores que não executam JavaScript. O SEO cliente foi integrado; a adaptação do HTML no Cloudflare depende do inventário importado. `/m/:slug` da plataforma permanece inalterado.
6. **Validação autenticada:** Supabase externo não fornece sessão de teste neste ambiente. Edição, duplicação, upload, negativas de permissão, inscrição → CRM → convite → e-mail → ativação precisam ser conferidos em sessão real. Não usar inscrições fictícias em produção para forçar essa validação.

## Procedimento e rollback

1. Importar páginas primeiro, depois blocos/conteúdos; preservar IDs ou manter mapa explícito. Nunca importar roles do LPs.
2. Reconciliar leads por identidade com CRM antes de importar históricos; não disparar novamente e-mails/presenças/pontos de cadastros antigos.
3. Conferir contagens, todos os campos, estilos, arquivos e URLs antes/depois. Os seeds do código antigo não são exportação da produção.
4. Testar em `/lps/:slug`; ativar apenas páginas conferidas.
5. Capturar evidência das conversões, origem, convite, validade, e-mails e `409` com dados autorizados.
6. Preparar sitemap e respostas de SEO no Cloudflare; testar headers e recuperação PWA existente.
7. Virar `lps.gentenetworking.com.br` com a opção habilitada e monitorar. Manter projeto anterior disponível para rollback do domínio; não excluí-lo.
8. Desativar encaminhamento entre projetos somente após reconciliação de pendências locais e estabilidade.

**Assinantes da Comunidade: nenhuma alteração nesta rodada.** Iniciar exclusivamente após esses testes e aceite da unificação.

## Alertas anteriores

58 avisos de segurança já existentes permanecem fora desta rodada. As migrações novas não deixam novos avisos; duplicação usa SECURITY INVOKER e permissões do Admin.