REVOKE EXECUTE ON FUNCTION public.configure_connection_onboarding(boolean,text,text,integer),public.record_connection_onboarding(uuid,integer) FROM authenticated;
CREATE FUNCTION public.connection_onboarding_dispatch(_caller uuid,_action text,_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF _caller IS NULL OR NOT public.is_active_user(_caller) THEN RAISE EXCEPTION 'Não autenticado'; END IF;
PERFORM set_config('request.jwt.claim.sub',_caller::text,true);
IF _action='configure' THEN PERFORM public.configure_connection_onboarding((_payload->>'enabled')::boolean,_payload->>'title',_payload->>'url',(_payload->>'duration')::integer); RETURN jsonb_build_object('success',true);
ELSIF _action='progress' THEN RETURN public.record_connection_onboarding((_payload->>'version')::uuid,(_payload->>'seconds')::integer);
ELSE RAISE EXCEPTION 'Ação inválida'; END IF; END $$;
REVOKE ALL ON FUNCTION public.connection_onboarding_dispatch(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.connection_onboarding_dispatch(uuid,text,jsonb) TO service_role;