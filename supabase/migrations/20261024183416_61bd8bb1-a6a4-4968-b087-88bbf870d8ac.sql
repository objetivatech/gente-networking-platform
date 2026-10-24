DO $mig$
DECLARE f record; def text; guard text := E'BEGIN\n  IF public.is_subscriber(auth.uid()) AND NOT public.is_community_member(auth.uid()) THEN RAISE EXCEPTION ''forbidden'' USING ERRCODE = ''42501''; END IF;\n';
BEGIN
  FOR f IN SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
             AND p.proname IN ('get_monthly_ranking','get_user_monthly_points','get_statistics_snapshot')
  LOOP
    def := pg_get_functiondef(f.oid);
    IF position('is_subscriber' in def) = 0 THEN
      def := regexp_replace(def, '\mBEGIN\M', guard);
      EXECUTE def;
    END IF;
  END LOOP;
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('create_matchmaking_check','register_matchmaking_attempt')
  LOOP
    def := pg_get_functiondef(f.oid);
    def := replace(def, $q$caller_role = 'convidado'$q$, $q$caller_role IN ('convidado','assinante') OR public.is_subscriber(auth.uid())$q$);
    EXECUTE def;
  END LOOP;
END $mig$;