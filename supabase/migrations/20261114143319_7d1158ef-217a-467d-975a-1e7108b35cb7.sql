CREATE OR REPLACE FUNCTION public.guest_can_confirm_meeting(_user_id uuid,_meeting_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.meetings m WHERE m.id=_meeting_id AND m.meeting_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date AND (
m.event_type='hub_event' OR EXISTS(SELECT 1 FROM public.guest_participations gp WHERE gp.profile_id=_user_id AND gp.status IN ('invited','confirmed','attended') AND (gp.meeting_id=m.id OR (gp.meeting_id IS NULL AND gp.team_id=m.team_id))) OR EXISTS(SELECT 1 FROM public.invitations i WHERE i.accepted_by=_user_id AND i.status='accepted' AND coalesce(i.metadata->>'superseded','false')<>'true' AND (i.event_id=m.id OR (i.event_id IS NULL AND m.meeting_date>=i.created_at::date AND (i.team_id=m.team_id OR coalesce(i.metadata->'allowed_team_ids','[]'::jsonb) ? m.team_id::text))))))
$$;
CREATE OR REPLACE FUNCTION public.validate_guest_agenda_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF auth.uid()=NEW.user_id AND public.is_guest(NEW.user_id) AND NOT public.guest_can_confirm_meeting(NEW.user_id,NEW.meeting_id) THEN RAISE EXCEPTION 'Este encontro exige um convite válido'; END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_guest_agenda_attendance() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_guest_agenda_attendance() TO service_role;
CREATE TRIGGER validate_guest_agenda_attendance BEFORE INSERT ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.validate_guest_agenda_attendance();
CREATE OR REPLACE FUNCTION public.get_meeting_invitations(_meeting_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); manages boolean;
BEGIN
IF u IS NULL OR NOT public.is_active_user(u) OR NOT(public.has_role(u,'admin') OR public.has_role(u,'facilitador') OR public.has_role(u,'membro')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
SELECT public.has_role(u,'admin') OR (public.has_role(u,'facilitador') AND public.is_team_facilitator(u,m.team_id)) INTO manages FROM public.meetings m WHERE m.id=_meeting_id;
RETURN coalesce((SELECT jsonb_agg(x ORDER BY x.name) FROM (
SELECT gp.id, p.full_name name,p.company,gp.status FROM public.guest_participations gp JOIN public.profiles p ON p.id=gp.profile_id WHERE gp.meeting_id=_meeting_id AND gp.status IN ('invited','confirmed') AND (manages OR gp.invited_by=u OR gp.metadata->>'reinvited_by'=u::text) AND NOT EXISTS(SELECT 1 FROM public.attendances a WHERE a.meeting_id=_meeting_id AND a.user_id=p.id)
UNION ALL
SELECT i.id,coalesce(i.name,'Convidado'),NULL::text,'aguardando_ativacao' FROM public.invitations i WHERE i.event_id=_meeting_id AND i.status='pending' AND i.expires_at>now() AND (manages OR i.invited_by=u)
) x),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.get_meeting_invitations(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_meeting_invitations(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.guest_meetings_dispatch(_caller uuid,_action text,_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
PERFORM set_config('request.jwt.claim.sub',_caller::text,true);
IF _action='agenda' THEN RETURN public.get_guest_agenda();
ELSIF _action='confirm' THEN RETURN public.set_guest_meeting_confirmation((_payload->>'meeting_id')::uuid,(_payload->>'confirm')::boolean);
ELSIF _action='invite' THEN RETURN public.invite_person_to_meeting((_payload->>'meeting_id')::uuid,_payload->>'name',_payload->>'email',_payload->>'phone',_payload->>'company');
ELSIF _action='invitations' THEN RETURN public.get_meeting_invitations((_payload->>'meeting_id')::uuid);
ELSE RAISE EXCEPTION 'Ação inválida'; END IF;
END $$;