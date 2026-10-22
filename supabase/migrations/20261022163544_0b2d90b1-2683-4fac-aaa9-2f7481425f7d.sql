DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND p.proname IN (
      'get_integration_secret','crm_log_identity_block','register_crm_lead_page','recalculate_crm_attendance',
      'generate_unique_slug','calculate_monthly_points_for_team','calculate_user_points',
      'update_all_monthly_points_for_user','update_monthly_points_for_team','update_user_points_and_rank','get_guests_directory')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;