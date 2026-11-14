-- © 2026 Ranktop SEO Inteligente. @author Diogo Devitte
CREATE OR REPLACE FUNCTION public.connection_onboarding_dispatch(_caller uuid,_action text,_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF _caller IS NULL OR NOT public.is_active_user(_caller) THEN RAISE EXCEPTION 'Não autenticado'; END IF;
PERFORM set_config('request.jwt.claim.sub',_caller::text,true);
IF _action='configure' THEN PERFORM public.configure_connection_onboarding((_payload->>'enabled')::boolean,_payload->>'title',nullif(_payload->>'url',''),(_payload->>'duration')::integer); RETURN jsonb_build_object('success',true);
ELSIF _action='progress' THEN RETURN public.record_connection_onboarding((_payload->>'version')::uuid,(_payload->>'seconds')::integer);
ELSE RAISE EXCEPTION 'Ação inválida'; END IF; END $$;
UPDATE public.landing_pages SET name=replace(name,'Assinantes da Comunidade','Gente Conexões'),meta_title=replace(meta_title,'Assinantes da Comunidade','Gente Conexões'),meta_description=replace(replace(meta_description,'Assinantes da Comunidade','Gente Conexões'),'Assinante da Comunidade','Gente Conexões'),updated_at=now() WHERE slug='assinantes';