DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.renew_guest_invitation(uuid)'::regprocedure) INTO d;
  d := replace(d, 'public.is_team_facilitator(auth.uid(), v_team)', 'public.is_team_facilitator(v_team, auth.uid())');
  EXECUTE d;
END $$;