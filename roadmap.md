# Roadmap v3.50.0 — Convites, Participações, CRM e Resgate

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

- [ ] Substituir o worker antigo no mesmo endereço por limpeza seletiva, sem apagar sessão ou caches de outros serviços.
- [ ] Manter manifest/ícones e suspender cache offline do aplicativo durante a recuperação.
- [ ] Remover recargas automáticas que podem repetir a falha e evitar esperas de notificações sem worker.
- [ ] Validar limpeza, preservação de dados, instalação e ausência de registros no preview; documentar implantação Cloudflare.
