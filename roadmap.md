# Roadmap v3.50.0 — Convites, Participações, CRM e Resgate

# Unificação LPs e entrada pública — sem Assinante

- [x] Passar entrada para editor avançado, preservar conteúdo anterior e aplicar logos oficiais enviados em 22/10; cadastro aberto permanece ausente.

- [x] Integrar código do gerenciador e renderizador existentes com acesso exclusivo do Admin.
- [x] Centralizar novos formulários no endpoint CRM existente; sem segundo banco/fila local ou duplicação de ativação.
- [x] Criar página de entrada editável pelo gerenciador; login sem cadastro aberto; preservar ativação por convite.
- [x] Preservar domínio raiz canônico no código e roteamento de URLs opt-in; Meta somente via GTM.
- [x] Receber e filtrar exportação de 22/10: 4 páginas, 18 blocos, 2 conteúdos avançados, 48 mídias, 632 auditorias e 686 leads (541 e-mails distintos).
- [x] Importar 4 páginas inativas, 18 blocos e 2 conteúdos avançados com UUIDs e conteúdo conferidos; entrada atual preservada.
- [ ] Importar mídia histórica e trocar links do projeto antigo — bucket público confirmado em 22/10; transferir e verificar os 48 arquivos.
- [ ] Importar 632 auditorias históricas — pendente de carga segura do arquivo completo, sem perder autores e alterações.
- [ ] Reconciliar 686 registros históricos com CRM/perfis sem disparar convites, e-mails ou pontos; preservar 145 inscrições repetidas como histórico.
- [ ] Liberar entrega permanente de novas imagens — atualizar biblioteca para URLs públicas permanentes, sem links temporários.
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

- [ ] Executar exclusivamente em uma etapa separada, após as correções; não implementar neste bloco.

# Recuperação de atualização PWA — etapa exclusiva de correção

- [x] Substituir o worker antigo no mesmo endereço por limpeza seletiva, sem apagar sessão ou caches de outros serviços.
- [x] Manter manifest/ícones e suspender cache offline do aplicativo durante a recuperação.
- [x] Remover recargas automáticas que podem repetir a falha e evitar esperas de notificações sem worker.
- [x] Validar limpeza seletiva em testes, preservação de dados locais, manifest/ícones e ausência de registros no preview; documentar implantação Cloudflare. 55 testes passaram; página de instalação sem erros de execução.
- [ ] Publicar pelo fluxo GitHub → Cloudflare e validar retorno com worker anterior instalado, cabeçalhos efetivos e páginas autenticadas — depende de publicação externa e sessão real, indisponíveis neste ambiente.
