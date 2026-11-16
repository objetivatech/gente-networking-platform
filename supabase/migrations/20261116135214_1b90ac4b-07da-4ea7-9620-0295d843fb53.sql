CREATE OR REPLACE FUNCTION public.set_guest_meeting_confirmation(_meeting_id uuid, _confirm boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE u uuid:=auth.uid(); m public.meetings%ROWTYPE; p public.profiles%ROWTYPE; l public.crm_leads%ROWTYPE; gp public.guest_participations%ROWTYPE; lid uuid; original uuid; inv_id uuid; gp_id uuid; hub_created boolean:=false;
BEGIN
IF u IS NULL OR NOT public.is_active_user(u) OR NOT (public.is_guest(u) OR public.is_subscriber(u)) THEN RAISE EXCEPTION 'Acesso reservado a Convidados ativos'; END IF;
SELECT * INTO p FROM public.profiles WHERE id=u FOR UPDATE;
SELECT * INTO m FROM public.meetings WHERE id=_meeting_id;
IF m.id IS NULL OR m.meeting_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Encontro indisponível'; END IF;
IF _confirm IS NULL THEN RAISE EXCEPTION 'Confirmação inválida'; END IF;
IF _confirm AND NOT public.guest_can_confirm_meeting(u,m.id) THEN RAISE EXCEPTION 'Este encontro exige um convite do Grupo'; END IF;
SELECT * INTO gp FROM public.guest_participations WHERE profile_id=u AND status IN ('invited','confirmed','attended') AND (meeting_id=m.id OR (meeting_id IS NULL AND team_id=m.team_id)) ORDER BY (meeting_id=m.id) DESC NULLS LAST,created_at LIMIT 1;
SELECT id,invited_by INTO inv_id,original FROM public.invitations WHERE accepted_by=u AND status='accepted' AND coalesce(metadata->>'superseded','false')<>'true' ORDER BY accepted_at,created_at LIMIT 1;
original:=coalesce(gp.invited_by,original,u); inv_id:=coalesce(gp.invitation_id,inv_id);
IF NOT _confirm AND (gp.status='attended' OR EXISTS(SELECT 1 FROM public.attendances WHERE meeting_id=m.id AND user_id=u)) THEN RAISE EXCEPTION 'O comparecimento já foi registrado. Solicite a revisão ao Facilitador ou Admin'; END IF;
IF m.event_type='hub_event' THEN
SELECT * INTO l FROM public.crm_leads WHERE archived_at IS NULL AND (profile_id=u OR (profile_id IS NULL AND lower(email)=lower(p.email))) ORDER BY (profile_id=u) DESC NULLS LAST,created_at LIMIT 1;
lid:=l.id;
IF _confirm AND lid IS NULL THEN
IF nullif(p.email,'') IS NULL THEN RAISE EXCEPTION 'Preencha o e-mail do perfil'; END IF;
INSERT INTO public.crm_leads(name,email,phone,company,business_segment,source,source_detail,status,profile_id,invited_by,onboarding_category,onboarding_status,metadata) VALUES(p.full_name,p.email,p.phone,p.company,p.business_segment,'api','plataforma_convidado_hub','novo',u,nullif(original,u),'gente_hub','convidado_ativo',jsonb_build_object('source_context','plataforma_convidado_hub')) RETURNING id INTO lid;
ELSIF _confirm THEN
UPDATE public.crm_leads SET profile_id=coalesce(profile_id,u),metadata=metadata||jsonb_build_object('last_hub_confirmation',m.id),updated_at=now() WHERE id=lid;
END IF;
END IF;
IF _confirm THEN
IF gp.meeting_id=m.id THEN
UPDATE public.guest_participations SET status=CASE WHEN status='attended' THEN status ELSE 'confirmed' END,confirmed_at=coalesce(confirmed_at,now()),cancelled_at=NULL,updated_at=now() WHERE id=gp.id RETURNING id INTO gp_id;
ELSE
INSERT INTO public.guest_participations(profile_id,team_id,meeting_id,invited_by,invitation_id,status,confirmed_at,metadata)
VALUES(u,m.team_id,m.id,original,inv_id,'confirmed',now(),coalesce(gp.metadata,'{}'::jsonb)||jsonb_build_object('source','agenda_confirmation')) RETURNING id INTO gp_id;
END IF;
IF m.event_type='hub_event' AND lid IS NOT NULL THEN
INSERT INTO public.meeting_lead_attendances(meeting_id,lead_id,added_by) VALUES(m.id,lid,u) ON CONFLICT DO NOTHING;
GET DIAGNOSTICS hub_created = ROW_COUNT;
UPDATE public.guest_participations SET lead_id=lid,metadata=metadata||jsonb_build_object('hub_registration_created',coalesce((metadata->>'hub_registration_created')::boolean,false) OR hub_created) WHERE id=gp_id;
END IF;
ELSE
IF gp.meeting_id=m.id AND gp.status='confirmed' THEN
UPDATE public.guest_participations SET status='invited',confirmed_at=NULL,cancelled_at=now(),updated_at=now() WHERE id=gp.id;
IF m.event_type='hub_event' AND coalesce((gp.metadata->>'hub_registration_created')::boolean,false) THEN
DELETE FROM public.meeting_lead_attendances WHERE meeting_id=m.id AND lead_id=gp.lead_id AND added_by=u;
UPDATE public.guest_participations SET metadata=metadata||'{"hub_registration_created":false}'::jsonb WHERE id=gp.id;
END IF;
END IF;
END IF;
IF lid IS NOT NULL THEN PERFORM public.recalculate_crm_attendance(lid); END IF;
RETURN jsonb_build_object('success',true,'confirmed',_confirm);
END $function$;
REVOKE ALL ON FUNCTION public.set_guest_meeting_confirmation(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_guest_meeting_confirmation(uuid,boolean) TO service_role;
DO $patch$ DECLARE definition text; BEGIN
SELECT pg_get_functiondef('public.get_guest_agenda()'::regprocedure) INTO definition;
definition:=replace(definition,'EXISTS(SELECT 1 FROM public.attendances a WHERE a.meeting_id=m.id AND a.user_id=auth.uid()) is_attending','(EXISTS(SELECT 1 FROM public.attendances a WHERE a.meeting_id=m.id AND a.user_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.guest_participations gp WHERE gp.profile_id=auth.uid() AND gp.meeting_id=m.id AND gp.status IN (''confirmed'',''attended''))) is_attending');
EXECUTE definition;
END $patch$;
CREATE OR REPLACE FUNCTION public.confirm_guest_next_meeting(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE inv public.invitations%ROWTYPE; m public.meetings%ROWTYPE;
BEGIN
SELECT * INTO inv FROM public.invitations WHERE accepted_by=_user_id AND status='accepted' AND coalesce(metadata->>'superseded','false')<>'true' ORDER BY accepted_at DESC LIMIT 1;
IF inv.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','no_invitation'); END IF;
IF NOT public.is_guest(_user_id) THEN RETURN jsonb_build_object('success',true,'meeting',NULL); END IF;
SELECT * INTO m FROM public.meetings WHERE meeting_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date AND ((inv.event_id IS NOT NULL AND id=inv.event_id) OR (inv.event_id IS NULL AND team_id=inv.team_id)) ORDER BY meeting_date,meeting_time NULLS LAST LIMIT 1;
IF m.id IS NULL THEN RETURN jsonb_build_object('success',true,'meeting',NULL); END IF;
PERFORM set_config('request.jwt.claim.sub',_user_id::text,true);
PERFORM public.set_guest_meeting_confirmation(m.id,true);
RETURN jsonb_build_object('success',true,'meeting',jsonb_build_object('id',m.id,'title',m.title,'meeting_date',m.meeting_date,'meeting_time',m.meeting_time,'location',m.location));
END $function$;
REVOKE ALL ON FUNCTION public.confirm_guest_next_meeting(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_guest_next_meeting(uuid) TO service_role;
INSERT INTO public.system_changelog(version,title,description,category,changes) SELECT '3.64.6','Correção da confirmação de encontros','Confirmação separada de comparecimento, convites preservados e HUB integrado ao CRM.','fix','["Confirmação Premium sem presença ou pontos antecipados","Confirmação por encontro preserva autoria e convite de Grupo","HUB mantém vínculo e contagem CRM deduplicados","Ativação usa a mesma confirmação segura"]'::jsonb WHERE NOT EXISTS(SELECT 1 FROM public.system_changelog WHERE version='3.64.6');