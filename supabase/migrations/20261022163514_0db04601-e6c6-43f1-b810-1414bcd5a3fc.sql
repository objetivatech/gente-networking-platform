DO $$
DECLARE f record;
  anon_allow text[] := ARRAY['get_invitation_by_code','get_public_profile','get_public_profile_activity','get_public_profile_cases','get_public_profile_stats','get_public_profile_slugs','has_role','are_same_team','is_active_user','is_community_member','is_guest','is_team_facilitator'];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname, pg_get_function_result(p.oid) AS res
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND p.prokind='f'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    IF f.res = 'trigger' THEN
      -- Funções de gatilho rodam automaticamente; ninguém precisa chamá-las diretamente
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
      IF f.proname = ANY(anon_allow) THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f.sig);
      END IF;
    END IF;
  END LOOP;
END $$;