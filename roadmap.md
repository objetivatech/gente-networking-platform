# Roadmap v3.50.0 — Convites, Participações, CRM e Resgate

# Unificação LPs e entrada pública — sem Assinante

- [ ] Integrar gerenciador e renderizador existentes com acesso exclusivo do Admin.
- [ ] Centralizar novos formulários no CRM preservando identidade, convites e rastreios.
- [ ] Criar página de entrada editável pelo gerenciador; login sem cadastro aberto; preservar ativação por convite.
- [ ] Preservar domínio raiz canônico e URLs públicas; Meta somente via GTM.
- [ ] Importar conteúdo e mídia históricos — exige exportação do banco do projeto LPs.
- [ ] Validar fluxos, testes e documentação antes da virada Cloudflare.

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
