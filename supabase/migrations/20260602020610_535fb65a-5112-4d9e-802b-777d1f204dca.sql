CREATE OR REPLACE FUNCTION public._debug_test_attendance(_uid uuid, _mid uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  res text := 'OK';
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid::text, 'role','authenticated')::text, true);
  BEGIN
    INSERT INTO public.attendances (meeting_id, user_id) VALUES (_mid, _uid);
    RAISE EXCEPTION 'ROLLBACK_OK';
  EXCEPTION
    WHEN OTHERS THEN
      res := SQLERRM;
  END;
  RETURN res;
END;
$$;
REVOKE ALL ON FUNCTION public._debug_test_attendance(uuid,uuid) FROM public;