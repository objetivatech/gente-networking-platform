CREATE OR REPLACE FUNCTION public.add_activity_feed(_user_id uuid, _activity_type text, _title text, _description text DEFAULT NULL::text, _reference_id uuid DEFAULT NULL::uuid, _metadata jsonb DEFAULT '{}'::jsonb, _team_id uuid DEFAULT NULL::uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO activity_feed (user_id, activity_type, title, description, reference_id, metadata, team_id)
  VALUES (_user_id, _activity_type, _title, _description, _reference_id, COALESCE(_metadata, '{}'::jsonb), _team_id)
  RETURNING id INTO new_id;
  RETURN new_id;
EXCEPTION WHEN insufficient_privilege OR raise_exception THEN RAISE;
WHEN OTHERS THEN
  RAISE WARNING 'add_activity_feed falhou (%): %', _activity_type, SQLERRM;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_all_monthly_points(_year_month text DEFAULT NULL::text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE user_record RECORD; count INTEGER := 0; current_month TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  current_month := COALESCE(_year_month, get_current_year_month());
  FOR user_record IN SELECT DISTINCT user_id FROM team_members LOOP
    PERFORM update_all_monthly_points_for_user(user_record.user_id, current_month);
    count := count + 1;
  END LOOP;
  RETURN count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_all_user_points()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE user_record RECORD; count INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR user_record IN SELECT id FROM profiles LOOP
    PERFORM update_user_points_and_rank(user_record.id);
    count := count + 1;
  END LOOP;
  RETURN count;
END;
$function$;

DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.get_group_members_for_notification(uuid)'::regprocedure) INTO d;
  d := replace(d, 'AND p.email IS NOT NULL', 'AND p.email IS NOT NULL AND (auth.uid() IS NULL OR auth.uid() = _user_id OR public.has_role(auth.uid(),''admin''))');
  EXECUTE d;
  SELECT pg_get_functiondef('public.accept_invitation(character varying, uuid)'::regprocedure) INTO d;
  d := regexp_replace(d, '\mBEGIN\M', E'BEGIN\n  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN RAISE EXCEPTION ''forbidden''; END IF;');
  EXECUTE d;
END $$;