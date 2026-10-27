# Roadmap v3.50.0 — Convites, Participações, CRM e Resgate

# Unificação LPs e entrada pública — sem Assinante

- [x] Modernizar entrada editável e criar página pública de Assinantes, com benefícios condicionados ao plano e evolução para Grupos Premium.
- [x] Remover acesso dos Convidados à Vitrine em menus, rotas e banco; preservar seus perfis como contatos autorizados.
- [x] Validar páginas públicas desktop/mobile, navegação, abertura do login, ausência de cadastro aberto e regressões de permissões; virada de domínio permanece fora desta rodada.
- [ ] Homologar edição e bloqueio da Vitrine em sessões reais Admin/Convidado — ambiente Supabase externo sem sessão disponível; testes unitários e definição da função conferidos, sem ampliar permissões para testar.

- [x] Passar entrada para editor avançado, preservar conteúdo anterior e aplicar logos oficiais enviados em 22/10; cadastro aberto permanece ausente.

- [x] Integrar código do gerenciador e renderizador existentes com acesso exclusivo do Admin.
- [x] Centralizar novos formulários no endpoint CRM existente; sem segundo banco/fila local ou duplicação de ativação.
- [x] Criar página de entrada editável pelo gerenciador; login sem cadastro aberto; preservar ativação por convite.
- [x] Preservar domínio raiz canônico no código e roteamento de URLs opt-in; Meta somente via GTM.
- [x] Receber e filtrar exportação de 22/10: 4 páginas, 18 blocos, 2 conteúdos avançados, 48 mídias, 632 auditorias e 686 leads (541 e-mails distintos).
- [x] Importar 4 páginas inativas, 18 blocos e 2 conteúdos avançados com UUIDs e conteúdo conferidos; entrada atual preservada.
- [x] Registrar as 48 imagens enviadas ao bucket pelo Admin na biblioteca e trocar links do projeto antigo; 48 arquivos públicos conferidos byte a byte, nenhum link antigo em blocos/conteúdo avançado.
- [x] Auditorias históricas excluídas do escopo a pedido do usuário.
- [x] Pareamento somente-leitura das 541 identidades com CRM, perfis/papéis e convites; 146 CRM, 13 perfis sem CRM, 20 candidatos por telefone, 362 sem correspondência. Conferir papéis separadamente (incluindo 13 perfis sem papel).
- [ ] Executar carga CRM autorizada em 24/10: tabela protegida e arquivo transacional preparados; envio integral excede o canal disponível (sem acesso SQL por arquivo/exec neste Supabase externo). 360 e-mails sem correspondência atual, 181 existentes ou em revisão; excluir telefones compartilhados antes da carga. Nenhum lead importado nesta etapa.
- [x] Liberar entrega permanente de novas imagens — biblioteca salva URLs públicas e resolve apontadores antigos; 12 testes passaram. Upload/seleção Admin ainda dependem de sessão real.
- [x] Testes unitários, entrada pública desktop/mobile, abertura login e recuperação, documentação de inventário e rollback.
- [ ] Validar edição Admin, negativos de acesso e LP → CRM → e-mail → ativação autenticados — Supabase externo sem sessão disponível; requer sessão real e dados autorizados.
- [ ] Concluir SEO servido no HTML, sitemap, rastreios e virada Cloudflare reversível — depende de exportação e testes acima.

- [x] Criar base segura de participações recorrentes e migrar vínculos existentes.
- [x] Centralizar convite manual, deduplicação, reutilização e renovação.
- [x] Integrar convites Premium e presenças ao CRM com última presença real.
- [x] Tornar os ciclos de Resgate reiniciáveis e separar Ex-Convidado de Ex-Membro.
- [x] Atualizar Convites, acesso do Convidado e Central de Resgate.
- [x] Atualizar documentação, memória e histórico v3.50.0.
- [x] Validar permissões, testes, tipos, função de Resgate e consistência final.

# Bloco 1 — Precisão dos indicadores e modais

- [x] Unificar contadores, períodos e escopo autorizado por Grupo; corrigir vínculo de Facilitador com segurança.
- [x] Corrigir contenção, altura, ações e edição da mensagem no modal WhatsApp.
- [x] Testar indicadores, permissões e modais; atualizar documentação.
- [ ] Validar leitura autenticada como Admin e Facilitador — indisponível neste ambiente com Supabase externo; não declarar validação E2E como concluída.

# Bloco 2 — Assinante da Comunidade

- [x] Ajustes aprovados: contadores por papel, atribuição explícita/reativação com plano, vitrine interativa e acesso administrativo, painel do Assinante, matriz de módulos e convites Premium preservando papel.

- [x] Fase 1 — Banco: papel `assinante`, `billing_plans.features` validado, `usage_quota_events`, `get_user_entitlements`/`get_feature_usage`, isolamento RLS do Assinante (pessoas e módulos de membros).
- [x] Fase 2 — Catraca no frontend (menu, rotas, início próprio) e bloqueio do Assinante em ranking, pontos e estatísticas no banco.
- [x] Fase 3 — Vitrine exclusiva de Assinantes/Convidados ativos e franquia mensal do MatchMaking; sugestão semanal não consome cota.
- [x] Fase 4 — Painel de planos e atribuição: recursos/limites editáveis no plano (franquia MatchMaking + 4 acessos), públicos Membro Premium e Assinante, atribuição/cancelamento de assinatura por perfil na Gestão de Pessoas (somente Admin).
- [x] Fase 5 — 98 testes da plataforma e 3 testes de cobrança; matriz, contadores, paginação, franquia e entrada pública sem erros.
- [ ] Fase 5 — Homologação de atribuição, cobrança, agendamento, convite Premium e consumo de cota com conta real — Supabase externo sem sessão autenticada disponível. Não criar/alterar conta de teste arbitrária.
- [x] v3.55.1 — Data inicial da assinatura e dos encontros no fuso de Brasília (era UTC e nascia "no dia seguinte" à noite, deixando o plano inativo); exibição de datas de assinatura/cobrança em DD/MM/AAAA; 104 testes passaram.
- [x] v3.56.0 — Convite em página única com ativação instantânea (sem 2º e-mail), presença automática no próximo encontro, Reconvidar por papel com WhatsApp e Admin movendo convidado entre Grupos.

# Recuperação de atualização PWA — etapa exclusiva de correção

- [x] Substituir o worker antigo no mesmo endereço por limpeza seletiva, sem apagar sessão ou caches de outros serviços.
- [x] Manter manifest/ícones e suspender cache offline do aplicativo durante a recuperação.
- [x] Remover recargas automáticas que podem repetir a falha e evitar esperas de notificações sem worker.
- [x] Validar limpeza seletiva em testes, preservação de dados locais, manifest/ícones e ausência de registros no preview; documentar implantação Cloudflare. 55 testes passaram; página de instalação sem erros de execução.
- [ ] Publicar pelo fluxo GitHub → Cloudflare e validar retorno com worker anterior instalado, cabeçalhos efetivos e páginas autenticadas — depende de publicação externa e sessão real, indisponíveis neste ambiente.
