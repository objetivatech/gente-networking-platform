CREATE OR REPLACE FUNCTION public.guest_can_confirm_meeting(_user_id uuid,_meeting_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.meetings m WHERE m.id=_meeting_id AND m.meeting_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date AND (
m.event_type='hub_event' OR EXISTS(SELECT 1 FROM public.guest_participations gp WHERE gp.profile_id=_user_id AND gp.status IN ('invited','confirmed','attended') AND (gp.meeting_id=m.id OR (gp.meeting_id IS NULL AND gp.team_id=m.team_id))) OR EXISTS(SELECT 1 FROM public.invitations i WHERE i.accepted_by=_user_id AND i.status='accepted' AND coalesce(i.metadata->>'superseded','false')<>'true' AND (i.event_id=m.id OR (i.event_id IS NULL AND i.team_id=m.team_id AND m.meeting_date>=i.created_at::date)))))
$$;
REVOKE ALL ON FUNCTION public.guest_can_confirm_meeting(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_can_confirm_meeting(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_guest_agenda()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF auth.uid() IS NULL OR NOT public.is_active_user(auth.uid()) OR NOT public.is_guest(auth.uid()) THEN RAISE EXCEPTION 'Acesso reservado a Convidados ativos'; END IF;
RETURN coalesce((SELECT jsonb_agg(row_data ORDER BY meeting_date,meeting_time NULLS LAST,id) FROM (
SELECT m.id,m.team_id,m.title,m.meeting_date,m.meeting_time,m.event_type,t.name team_name,
public.guest_can_confirm_meeting(auth.uid(),m.id) can_confirm,
CASE WHEN public.guest_can_confirm_meeting(auth.uid(),m.id) THEN m.location ELSE NULL END location,
EXISTS(SELECT 1 FROM public.attendances a WHERE a.meeting_id=m.id AND a.user_id=auth.uid()) is_attending,
(SELECT p.full_name FROM public.profiles p WHERE p.id=coalesce((SELECT coalesce((gp.metadata->>'reinvited_by')::uuid,gp.invited_by) FROM public.guest_participations gp WHERE gp.profile_id=auth.uid() AND gp.status IN ('invited','confirmed','attended') AND (gp.meeting_id=m.id OR (gp.meeting_id IS NULL AND gp.team_id=m.team_id)) ORDER BY (gp.meeting_id=m.id) DESC,gp.created_at DESC LIMIT 1),(SELECT i.invited_by FROM public.invitations i WHERE i.accepted_by=auth.uid() AND i.status='accepted' AND (i.event_id=m.id OR (i.event_id IS NULL AND i.team_id=m.team_id)) ORDER BY i.accepted_at LIMIT 1))) invited_by_name,
(SELECT jsonb_agg(jsonb_build_object('name',p.full_name,'phone',p.phone) ORDER BY p.full_name) FROM public.team_members tm JOIN public.profiles p ON p.id=tm.user_id WHERE tm.team_id=m.team_id AND tm.is_facilitator AND p.is_active) facilitators
FROM public.meetings m LEFT JOIN public.teams t ON t.id=m.team_id WHERE m.meeting_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
) row_data),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.get_guest_agenda() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_guest_agenda() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.set_guest_meeting_confirmation(_meeting_id uuid,_confirm boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); m public.meetings%ROWTYPE; p public.profiles%ROWTYPE; l public.crm_leads%ROWTYPE; lid uuid; original uuid;
BEGIN
IF u IS NULL OR NOT public.is_active_user(u) OR NOT public.is_guest(u) THEN RAISE EXCEPTION 'Acesso reservado a Convidados ativos'; END IF;
SELECT * INTO p FROM public.profiles WHERE id=u FOR UPDATE;
SELECT * INTO m FROM public.meetings WHERE id=_meeting_id;
IF m.id IS NULL OR m.meeting_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Encontro indisponível'; END IF;
IF _confirm AND NOT public.guest_can_confirm_meeting(u,m.id) THEN RAISE EXCEPTION 'Este encontro exige um convite do Grupo'; END IF;
IF _confirm IS NULL THEN RAISE EXCEPTION 'Confirmação inválida'; END IF;
SELECT invited_by INTO original FROM public.invitations WHERE accepted_by=u AND status='accepted' ORDER BY accepted_at,created_at LIMIT 1;
IF m.event_type='hub_event' THEN
SELECT * INTO l FROM public.crm_leads WHERE archived_at IS NULL AND (profile_id=u OR (profile_id IS NULL AND lower(email)=lower(p.email))) ORDER BY (profile_id=u) DESC,created_at LIMIT 1;
lid:=l.id;
IF _confirm AND lid IS NULL THEN
IF nullif(p.email,'') IS NULL THEN RAISE EXCEPTION 'Preencha o e-mail do perfil'; END IF;
INSERT INTO public.crm_leads(name,email,phone,company,business_segment,source,source_detail,status,profile_id,invited_by,onboarding_category,onboarding_status,metadata) VALUES(p.full_name,p.email,p.phone,p.company,p.business_segment,'api','plataforma_convidado_hub','novo',u,original,'gente_hub','convidado_ativo',jsonb_build_object('source_context','plataforma_convidado_hub')) RETURNING id INTO lid;
ELSIF _confirm THEN
UPDATE public.crm_leads SET profile_id=coalesce(profile_id,u),metadata=metadata||jsonb_build_object('last_hub_confirmation',m.id),updated_at=now() WHERE id=lid;
END IF;
END IF;
IF _confirm THEN
INSERT INTO public.attendances(meeting_id,user_id) VALUES(m.id,u) ON CONFLICT DO NOTHING;
UPDATE public.guest_participations SET status='confirmed',confirmed_at=now(),cancelled_at=NULL WHERE profile_id=u AND meeting_id=m.id AND status IN ('invited','confirmed');
IF m.event_type='hub_event' AND lid IS NOT NULL THEN INSERT INTO public.meeting_lead_attendances(meeting_id,lead_id,added_by) VALUES(m.id,lid,u) ON CONFLICT DO NOTHING; END IF;
ELSE
DELETE FROM public.attendances WHERE meeting_id=m.id AND user_id=u;
UPDATE public.guest_participations SET status='invited',confirmed_at=NULL,cancelled_at=now() WHERE profile_id=u AND meeting_id=m.id AND status='confirmed';
IF m.event_type='hub_event' THEN DELETE FROM public.meeting_lead_attendances mla USING public.crm_leads cl WHERE mla.lead_id=cl.id AND mla.meeting_id=m.id AND cl.profile_id=u; END IF;
END IF;
IF lid IS NOT NULL THEN PERFORM public.recalculate_crm_attendance(lid); END IF;
RETURN jsonb_build_object('success',true,'confirmed',_confirm);
END $$;
REVOKE ALL ON FUNCTION public.set_guest_meeting_confirmation(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_guest_meeting_confirmation(uuid,boolean) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.invite_person_to_meeting(_meeting_id uuid,_name text,_email text,_phone text DEFAULT NULL,_company text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid:=auth.uid(); m public.meetings%ROWTYPE; p public.profiles%ROWTYPE; r jsonb; n integer; pid uuid; old_author uuid;
BEGIN
IF c IS NULL OR NOT public.is_active_user(c) THEN RAISE EXCEPTION 'Não autenticado'; END IF;
SELECT * INTO m FROM public.meetings WHERE id=_meeting_id;
IF m.id IS NULL OR m.meeting_date<(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Selecione um encontro futuro'; END IF;
IF NOT public.has_role(c,'admin') AND NOT(public.has_role(c,'facilitador') AND m.team_id IS NOT NULL AND public.is_team_facilitator(c,m.team_id)) THEN RAISE EXCEPTION 'Sem permissão para convidar neste encontro'; END IF;
IF length(trim(coalesce(_name,''))) NOT BETWEEN 2 AND 255 OR length(_email)>255 OR coalesce(_email,'') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[[:alpha:]]{2,}$' OR length(coalesce(_phone,''))>40 OR length(coalesce(_company,''))>255 THEN RAISE EXCEPTION 'Confira nome, e-mail e telefone'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(lower(trim(_email)),0));
SELECT count(*) INTO n FROM public.profiles WHERE lower(email)=lower(trim(_email)) OR (nullif(regexp_replace(coalesce(_phone,''),'\D','','g'),'') IS NOT NULL AND phone_digits=right(regexp_replace(_phone,'\D','','g'),11));
IF n>1 THEN RAISE EXCEPTION 'E-mail e telefone apontam para cadastros diferentes. Revise em Gestão de Pessoas'; END IF;
SELECT * INTO p FROM public.profiles WHERE lower(email)=lower(trim(_email)) OR (nullif(regexp_replace(coalesce(_phone,''),'\D','','g'),'') IS NOT NULL AND phone_digits=right(regexp_replace(_phone,'\D','','g'),11)) LIMIT 1;
IF p.id IS NOT NULL THEN
PERFORM 1 FROM public.profiles WHERE id=p.id FOR UPDATE;
IF NOT p.is_active THEN RAISE EXCEPTION 'Reative esta pessoa em Gestão de Pessoas antes de convidar'; END IF;
IF public.is_guest(p.id) THEN r:=public.reinvite_guest_to_meeting(p.id,m.id); pid:=(r->>'participation_id')::uuid;
ELSIF public.is_subscriber(p.id) AND m.event_type='premium_group' THEN pid:=public.invite_subscriber_premium(p.id,m.id);
ELSE RAISE EXCEPTION 'Esta pessoa já possui acesso interno ou não pode receber este convite'; END IF;
RETURN jsonb_build_object('success',true,'action','participation_created','participation_id',pid,'guest_name',p.full_name,'guest_phone',p.phone);
END IF;
SELECT invited_by INTO old_author FROM public.invitations WHERE lower(email)=lower(trim(_email)) ORDER BY created_at LIMIT 1;
r:=public.create_guest_invitation(_name,lower(trim(_email)),_phone,m.team_id,m.id,m.event_type,NULL);
IF NOT coalesce((r->>'success')::boolean,false) THEN RETURN r; END IF;
UPDATE public.invitations SET invited_by=coalesce(old_author,invited_by),metadata=metadata||jsonb_build_object('meeting_invited_by',c) WHERE id=(r->>'invitation_id')::uuid;
UPDATE public.crm_leads SET company=coalesce(nullif(trim(_company),''),company) WHERE invitation_id=(r->>'invitation_id')::uuid;
RETURN r||jsonb_build_object('guest_name',_name,'guest_phone',_phone);
END $$;
REVOKE ALL ON FUNCTION public.invite_person_to_meeting(uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.invite_person_to_meeting(uuid,text,text,text,text) TO authenticated,service_role;

INSERT INTO public.system_changelog(version,title,description,category,changes) SELECT '3.63.0','Agenda do Convidado e convites por encontro','Agenda futura, confirmação Premium por convite, HUB aberto sincronizado ao CRM e convites diretos com autoria preservada.','feature','["Agenda segura para Convidados ativos","Confirmação e cancelamento HUB/CRM sem duplicação","Convite direto por Admin e Facilitador com e-mail e WhatsApp","Documentação dos fluxos e permissões atualizada"]'::jsonb WHERE NOT EXISTS(SELECT 1 FROM public.system_changelog WHERE version='3.63.0');