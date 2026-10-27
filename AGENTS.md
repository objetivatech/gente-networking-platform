# Regras de arquitetura

- Keep LP code isolated in `src/modules/lps` and reuse the platform client and UI tokens; this prevents cross-project auth and style collisions.
- Route new LP submissions exclusively through `submit-lead`; never create parallel lead/account/invitation writes or browser-local retry queues.
- Keep invitation signup and confirmation routes when simplifying `/auth`; login-only presentation must not disable invitation activation.
- Render platform entry from advanced content with an explicit section allowlist excluding lead forms; shared editor must not inject community signup defaults there.
- Render the public subscriber presentation and platform entry through the same presentation-only advanced CMS allowlist, including friendly and preview URLs; this prevents automatic lead/account forms and keeps editorial changes consistent.
- Bundle the official entry logos for external Cloudflare deployment while asset-path serving is unavailable there; do not depend on host-relative Lovable media endpoints for brand visibility.
- Keep public LP cutover separate from code migration until source exports, media portability, tracking and authenticated acceptance checks pass.
- Gate Cloudflare LP-host rewriting with `LP_UNIFIED_ENABLED`; it preserves source URLs and allows rollback without replacing the authenticated dashboard.
- Use permanent public URLs for the authorized `lps-media` bucket, resolving legacy pointers on read; never publish temporary signed Storage URLs in LP content.
- Sanitize LP HTML and preserve reserved application routes; editable public content must not execute arbitrary scripts on the authenticated origin.
- Preserve historical LP submissions in the Admin-only crm_historical_captures ledger; import only conflict-free new identities transactionally with rescue suppression and never replay live intake, because capture history must not change existing accounts, invitations or operational state.

- Separe ativação (`invitations`) de visitas recorrentes (`guest_participations`), pois uma nova participação nunca deve criar conta, presença, pontos ou promoção automaticamente.
- Consolide métricas de presença no CRM por encontro entre `attendances` e `meeting_lead_attendances`, pois a ativação pode ligar as duas fontes à mesma identidade.
- Modele cada nova ausência ou desativação como ciclo independente em `rescue_dispatches.cycle_started_at`, preservando todos os disparos históricos.
- Assinante da Comunidade deve ser implementado exclusivamente em etapa separada, nunca junto às correções.
- A vitrine e o MatchMaking do Assinante usam RPCs próprias (`get_community_showcase`, `get_matchmaking_profiles`, `draw_matchmaking_suggestion`); nunca consulte perfis amplos no cliente para esse papel.
- Indicadores consolidados usam `get_statistics_snapshot` e funções de `src/lib/statistics.ts`; não reintroduza somas de consultas truncadas ou dependentes de RLS do leitor.
- Universo operacional: perfis ativos Membro/Facilitador sem Admin; ranking competitivo mantém sua exclusão própria de Facilitadores.
- PWA recovery keeps manifest-only installation and the same-path `/sw.js` kill-switch for one release cycle; never register app-shell workers or add reload/version-polling loops, because stale navigation caches can strand users after deployment.
- Cache recovery deletes only known legacy app caches, preserves auth storage and messaging workers, and never waits on `serviceWorker.ready` without a registered worker, because sessions and notification controls must remain usable.

- Resolve module access through `has_module_access` and `useEntitlements`/`plan-access`; roles remain a data-universe ceiling and plan flags are enforced server-side as well as in navigation.
- Change subscription and subscriber identity only through explicit admin RPCs with a locked profile; never infer role changes from generic subscription writes or payment status.
- Read showcase detail through `get_community_profile` and invite subscribers through `guest_participations`; these flows must not query member directories or record attendance automatically.
- Use the authorized community-notification endpoint for plan, Premium invitation and scheduling messages, deriving recipients from persisted records instead of caller-provided addresses.
- Compute management cards and tabs from the same deduplicated filtered population, with paginated profile/role reads to prevent silent row-limit truncation.
- Serialize subscription writes on the same profile lock as role transitions and claim community email dispatches atomically; concurrent administrative actions must not duplicate access or messages.
- Complete invitation signup only through `complete-guest-signup` (confirmed account + accept + next-meeting attendance) and reinvite only via `reinvite_guest_to_meeting`, keeping the original `invited_by`; this removes the second e-mail without moving gamification authorship.
