REVOKE EXECUTE ON FUNCTION public.get_guest_agenda() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_guest_meeting_confirmation(uuid,boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.invite_person_to_meeting(uuid,text,text,text,text) FROM authenticated;
CREATE OR REPLACE FUNCTION public.guest_meetings_dispatch(_caller uuid,_action text,_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
PERFORM set_config('request.jwt.claim.sub',_caller::text,true);
IF _action='agenda' THEN RETURN public.get_guest_agenda();
ELSIF _action='confirm' THEN RETURN public.set_guest_meeting_confirmation((_payload->>'meeting_id')::uuid,(_payload->>'confirm')::boolean);
ELSIF _action='invite' THEN RETURN public.invite_person_to_meeting((_payload->>'meeting_id')::uuid,_payload->>'name',_payload->>'email',_payload->>'phone',_payload->>'company');
ELSE RAISE EXCEPTION 'Ação inválida'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.guest_meetings_dispatch(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_meetings_dispatch(uuid,text,jsonb) TO service_role;