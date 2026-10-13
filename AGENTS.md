# Regras de arquitetura

- Separe ativação (`invitations`) de visitas recorrentes (`guest_participations`), pois uma nova participação nunca deve criar conta, presença, pontos ou promoção automaticamente.
- Consolide métricas de presença no CRM por encontro entre `attendances` e `meeting_lead_attendances`, pois a ativação pode ligar as duas fontes à mesma identidade.
- Modele cada nova ausência ou desativação como ciclo independente em `rescue_dispatches.cycle_started_at`, preservando todos os disparos históricos.
- Assinante da Comunidade deve ser implementado exclusivamente em etapa separada, nunca junto às correções.
- Indicadores consolidados usam `get_statistics_snapshot` e funções de `src/lib/statistics.ts`; não reintroduza somas de consultas truncadas ou dependentes de RLS do leitor.
- Universo operacional: perfis ativos Membro/Facilitador sem Admin; ranking competitivo mantém sua exclusão própria de Facilitadores.
- PWA recovery keeps manifest-only installation and the same-path `/sw.js` kill-switch for one release cycle; never register app-shell workers or add reload/version-polling loops, because stale navigation caches can strand users after deployment.
- Cache recovery deletes only known legacy app caches, preserves auth storage and messaging workers, and never waits on `serviceWorker.ready` without a registered worker, because sessions and notification controls must remain usable.
