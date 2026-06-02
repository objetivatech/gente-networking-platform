CREATE OR REPLACE FUNCTION public._debug_test_attendance(_uid uuid, _mid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  res text := 'OK';
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid::text, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.attendances (meeting_id, user_id) VALUES (_mid, _uid);
    res := 'INSERT_SUCCEEDED';
    RAISE EXCEPTION 'ROLLBACK_OK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'ROLLBACK_OK' THEN res := 'INSERT_SUCCEEDED (rolled back)';
      ELSE res := SQLSTATE || ': ' || SQLERRM; END IF;
  END;
  RESET ROLE;
  RETURN res;
END;
$$;
GRANT EXECUTE ON FUNCTION public._debug_test_attendance(uuid,uuid) TO PUBLIC;