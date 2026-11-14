-- © 2026 Ranktop SEO Inteligente. @author Diogo Devitte
CREATE TABLE public.connection_onboarding_config (id boolean PRIMARY KEY DEFAULT true, enabled boolean NOT NULL DEFAULT false, title text NOT NULL DEFAULT 'Bem-vindo ao Gente Conexões', video_url text, duration_seconds integer NOT NULL DEFAULT 60, version uuid NOT NULL DEFAULT gen_random_uuid(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.connection_onboarding_config TO authenticated;
GRANT ALL ON public.connection_onboarding_config TO service_role;
ALTER TABLE public.connection_onboarding_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_config_read ON public.connection_onboarding_config FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE TABLE public.connection_onboarding_progress (profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, version uuid NOT NULL, watched_seconds integer NOT NULL DEFAULT 0, completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(profile_id,version));
GRANT SELECT ON public.connection_onboarding_progress TO authenticated;
GRANT ALL ON public.connection_onboarding_progress TO service_role;
ALTER TABLE public.connection_onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_progress_read ON public.connection_onboarding_progress FOR SELECT TO authenticated USING (profile_id=auth.uid() AND public.is_active_user(auth.uid()));
INSERT INTO public.connection_onboarding_config(id) VALUES(true);
CREATE FUNCTION public.configure_connection_onboarding(_enabled boolean,_title text,_url text,_duration integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT public.has_role(auth.uid(),'admin') OR NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Somente Admin'; END IF;
IF _enabled IS NULL OR _duration IS NULL OR _duration NOT BETWEEN 1 AND 7200 OR length(btrim(coalesce(_title,''))) NOT BETWEEN 1 AND 200 OR (_url IS NOT NULL AND (length(_url)>2048 OR _url !~ '^https://[^[:space:]]+')) OR (_enabled AND nullif(_url,'') IS NULL) THEN RAISE EXCEPTION 'Confira título, URL HTTPS e duração do vídeo'; END IF;
UPDATE public.connection_onboarding_config SET enabled=_enabled,title=btrim(_title),video_url=nullif(_url,''),duration_seconds=_duration,version=CASE WHEN video_url IS DISTINCT FROM nullif(_url,'') OR duration_seconds<>_duration THEN gen_random_uuid() ELSE version END,updated_at=now() WHERE id=true;
END $$;
REVOKE ALL ON FUNCTION public.configure_connection_onboarding(boolean,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.configure_connection_onboarding(boolean,text,text,integer) TO authenticated,service_role;
CREATE FUNCTION public.record_connection_onboarding(_version uuid,_seconds integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.connection_onboarding_config%ROWTYPE; p public.connection_onboarding_progress%ROWTYPE; delta integer;
BEGIN
IF NOT public.is_active_user(auth.uid()) OR NOT public.is_subscriber(auth.uid()) THEN RAISE EXCEPTION 'Acesso reservado ao Gente Conexões'; END IF;
IF _seconds IS NULL OR _seconds NOT BETWEEN 0 AND 30 THEN RAISE EXCEPTION 'Progresso inválido'; END IF;
SELECT * INTO c FROM public.connection_onboarding_config WHERE id=true FOR SHARE;
IF NOT c.enabled OR c.version IS DISTINCT FROM _version THEN RAISE EXCEPTION 'Vídeo alterado; recarregue a página'; END IF;
INSERT INTO public.connection_onboarding_progress(profile_id,version) VALUES(auth.uid(),c.version) ON CONFLICT DO NOTHING;
SELECT * INTO p FROM public.connection_onboarding_progress WHERE profile_id=auth.uid() AND version=c.version FOR UPDATE;
delta:=least(_seconds,greatest(0,floor(extract(epoch FROM now()-p.updated_at))::integer));
UPDATE public.connection_onboarding_progress SET watched_seconds=least(c.duration_seconds,watched_seconds+delta),completed_at=CASE WHEN watched_seconds+delta>=c.duration_seconds THEN coalesce(completed_at,now()) ELSE completed_at END,updated_at=now() WHERE profile_id=auth.uid() AND version=c.version RETURNING * INTO p;
RETURN jsonb_build_object('watched_seconds',p.watched_seconds,'completed_at',p.completed_at);
END $$;
REVOKE ALL ON FUNCTION public.record_connection_onboarding(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_connection_onboarding(uuid,integer) TO authenticated,service_role;
-- Preserve existing guest implementation and downstream CRM logic.
DO $$ DECLARE definition text; BEGIN
SELECT pg_get_functiondef('public.get_guest_agenda()'::regprocedure) INTO definition;
definition:=replace(definition,'NOT public.is_guest(auth.uid())','NOT (public.is_guest(auth.uid()) OR public.is_subscriber(auth.uid()))');
EXECUTE definition;
SELECT pg_get_functiondef('public.set_guest_meeting_confirmation(uuid,boolean)'::regprocedure) INTO definition;
definition:=replace(definition,'NOT public.is_guest(u)','NOT (public.is_guest(u) OR public.is_subscriber(u))');
EXECUTE definition;
END $$;
CREATE OR REPLACE FUNCTION public.guest_can_confirm_meeting(_user_id uuid,_meeting_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT public.is_active_user(_user_id) AND EXISTS(SELECT 1 FROM public.meetings m WHERE m.id=_meeting_id AND m.meeting_date>=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND (
(public.is_subscriber(_user_id) AND EXISTS(SELECT 1 FROM public.guest_participations gp WHERE gp.profile_id=_user_id AND gp.meeting_id=m.id AND gp.status IN ('invited','confirmed','attended')))
OR (NOT public.is_subscriber(_user_id) AND (m.event_type='hub_event' OR EXISTS(SELECT 1 FROM public.guest_participations gp WHERE gp.profile_id=_user_id AND gp.status IN ('invited','confirmed','attended') AND (gp.meeting_id=m.id OR (gp.meeting_id IS NULL AND gp.team_id=m.team_id))) OR EXISTS(SELECT 1 FROM public.invitations i WHERE i.accepted_by=_user_id AND i.status='accepted' AND coalesce(i.metadata->>'superseded','false')<>'true' AND (i.event_id=m.id OR (i.event_id IS NULL AND m.meeting_date>=i.created_at::date AND (i.team_id=m.team_id OR coalesce(i.metadata->'allowed_team_ids','[]'::jsonb) ? m.team_id::text))))))));
$$;
REVOKE ALL ON FUNCTION public.guest_can_confirm_meeting(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_can_confirm_meeting(uuid,uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_guest_agenda(),public.set_guest_meeting_confirmation(uuid,boolean) FROM authenticated;
CREATE OR REPLACE FUNCTION public.validate_guest_agenda_attendance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid()=NEW.user_id AND (public.is_guest(NEW.user_id) OR public.is_subscriber(NEW.user_id)) AND NOT public.guest_can_confirm_meeting(NEW.user_id,NEW.meeting_id) THEN RAISE EXCEPTION 'Este encontro exige um convite válido'; END IF;
RETURN NEW; END $$;
CREATE FUNCTION public.invite_connection_to_event(_profile uuid,_meeting uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.meetings%ROWTYPE; pid uuid; c uuid:=auth.uid(); BEGIN
SELECT * INTO m FROM public.meetings WHERE id=_meeting;
IF c IS NULL OR NOT public.is_active_user(c) OR m.id IS NULL OR m.meeting_date<(now() AT TIME ZONE 'America/Sao_Paulo')::date OR NOT(public.has_role(c,'admin') OR (public.has_role(c,'facilitador') AND public.is_team_facilitator(c,m.team_id))) THEN RAISE EXCEPTION 'Sem permissão para convidar neste encontro'; END IF;
PERFORM 1 FROM public.profiles WHERE id=_profile AND is_active FOR UPDATE;
IF NOT FOUND OR NOT public.is_subscriber(_profile) THEN RAISE EXCEPTION 'Pessoa indisponível'; END IF;
SELECT id INTO pid FROM public.guest_participations WHERE profile_id=_profile AND meeting_id=_meeting ORDER BY created_at LIMIT 1;
IF pid IS NULL THEN INSERT INTO public.guest_participations(profile_id,meeting_id,team_id,invited_by,status) VALUES(_profile,_meeting,m.team_id,c,'invited') RETURNING id INTO pid;
ELSE UPDATE public.guest_participations SET status=CASE WHEN status IN ('confirmed','attended') THEN status ELSE 'invited' END,cancelled_at=NULL WHERE id=pid; END IF;
RETURN pid; END $$;
REVOKE ALL ON FUNCTION public.invite_connection_to_event(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.invite_connection_to_event(uuid,uuid) TO service_role;
DO $$ DECLARE definition text; BEGIN
SELECT pg_get_functiondef('public.invite_person_to_meeting(uuid,text,text,text,text)'::regprocedure) INTO definition;
definition:=replace(definition, 'ELSIF public.is_subscriber(p.id) AND m.event_type=''premium_group'' THEN pid:=public.invite_subscriber_premium(p.id,m.id);','ELSIF public.is_subscriber(p.id) THEN pid:=public.invite_connection_to_event(p.id,m.id);');
EXECUTE definition;
END $$;
INSERT INTO public.system_changelog(version,title,description,category,changes) VALUES('3.64.1','Gente Conexões — agenda e acolhimento','Fase 2: agenda por convite e vídeo obrigatório configurável, com progresso privado persistente.','feature','["Agenda futura do Gente Conexões: confirmação somente por convite específico, inclusive HUB","Vídeo configurável pelo Admin; conclusão persistida por pessoa e versão","Nome comercial atualizado preservando papel assinante e URLs","Reaproveitamento do dispatcher, CRM e contagens existentes"]'::jsonb);