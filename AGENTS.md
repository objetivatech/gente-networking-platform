# Regras de arquitetura

- Keep LP code isolated in `src/modules/lps` and reuse the platform client and UI tokens; this prevents cross-project auth and style collisions.
- Route new LP submissions exclusively through `submit-lead`; never create parallel lead/account/invitation writes or browser-local retry queues.
- Keep invitation signup and confirmation routes when simplifying `/auth`; login-only presentation must not disable invitation activation.
- Render platform entry from advanced content with an explicit section allowlist excluding lead forms; shared editor must not inject community signup defaults there.
- Keep public LP cutover separate from code migration until source exports, media portability, tracking and authenticated acceptance checks pass.
- Gate Cloudflare LP-host rewriting with `LP_UNIFIED_ENABLED`; it preserves source URLs and allows rollback without replacing the authenticated dashboard.
- Never publish temporary signed Storage URLs in LP content; private library uploads remain preview-only until public asset delivery is authorized.
- Sanitize LP HTML and preserve reserved application routes; editable public content must not execute arbitrary scripts on the authenticated origin.

- Separe ativação (`invitations`) de visitas recorrentes (`guest_participations`), pois uma nova participação nunca deve criar conta, presença, pontos ou promoção automaticamente.
- Consolide métricas de presença no CRM por encontro entre `attendances` e `meeting_lead_attendances`, pois a ativação pode ligar as duas fontes à mesma identidade.
- Modele cada nova ausência ou desativação como ciclo independente em `rescue_dispatches.cycle_started_at`, preservando todos os disparos históricos.
- Assinante da Comunidade deve ser implementado exclusivamente em etapa separada, nunca junto às correções.
- Indicadores consolidados usam `get_statistics_snapshot` e funções de `src/lib/statistics.ts`; não reintroduza somas de consultas truncadas ou dependentes de RLS do leitor.
- Universo operacional: perfis ativos Membro/Facilitador sem Admin; ranking competitivo mantém sua exclusão própria de Facilitadores.
- PWA recovery keeps manifest-only installation and the same-path `/sw.js` kill-switch for one release cycle; never register app-shell workers or add reload/version-polling loops, because stale navigation caches can strand users after deployment.
- Cache recovery deletes only known legacy app caches, preserves auth storage and messaging workers, and never waits on `serviceWorker.ready` without a registered worker, because sessions and notification controls must remain usable.
