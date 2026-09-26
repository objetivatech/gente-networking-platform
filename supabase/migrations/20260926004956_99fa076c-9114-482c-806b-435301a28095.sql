CREATE TABLE public.guest_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  attended_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_participations_identity_check CHECK (profile_id IS NOT NULL OR lead_id IS NOT NULL),
  CONSTRAINT guest_participations_destination_check CHECK (team_id IS NOT NULL OR meeting_id IS NOT NULL),
  CONSTRAINT guest_participations_status_check CHECK (status IN ('invited','confirmed','attended','cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_participations TO authenticated;
GRANT ALL ON public.guest_participations TO service_role;
ALTER TABLE public.guest_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participante vê as próprias participações"
  ON public.guest_participations FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "Administradores gerenciam participações"
  ON public.guest_participations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Facilitadores veem participações do Grupo"
  ON public.guest_participations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'facilitador')
    AND team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.is_facilitator = true
    )
  );
CREATE POLICY "Facilitadores criam participações do Grupo"
  ON public.guest_participations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.is_facilitator = true
    )
  );
CREATE POLICY "Convidadores veem participações criadas"
  ON public.guest_participations FOR SELECT TO authenticated
  USING (invited_by = auth.uid());
CREATE INDEX guest_participations_profile_idx ON public.guest_participations(profile_id, status);
CREATE INDEX guest_participations_lead_idx ON public.guest_participations(lead_id, status);
CREATE INDEX guest_participations_team_idx ON public.guest_participations(team_id, status);
CREATE INDEX guest_participations_meeting_idx ON public.guest_participations(meeting_id, status);
CREATE UNIQUE INDEX guest_participations_active_destination_idx
  ON public.guest_participations(
    COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(lead_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(meeting_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) WHERE status <> 'cancelled';
CREATE TRIGGER guest_participations_updated_at
  BEFORE UPDATE ON public.guest_participations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.invitations
  ADD COLUMN renewal_of_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL;
CREATE INDEX invitations_renewal_of_idx ON public.invitations(renewal_of_id);

ALTER TABLE public.crm_leads
  ADD COLUMN last_attendance_at timestamptz,
  ADD COLUMN previous_role public.app_role;
CREATE INDEX crm_leads_last_attendance_idx
  ON public.crm_leads(last_attendance_at) WHERE archived_at IS NULL;

ALTER TABLE public.rescue_dispatches
  ADD COLUMN cycle_started_at timestamptz;
DROP INDEX IF EXISTS public.rescue_dispatches_profile_campaign_idx;
DROP INDEX IF EXISTS public.rescue_dispatches_lead_campaign_idx;
CREATE UNIQUE INDEX rescue_dispatches_profile_campaign_cycle_idx
  ON public.rescue_dispatches(profile_id, campaign_id, cycle_started_at)
  WHERE profile_id IS NOT NULL AND campaign_id IS NOT NULL AND cycle_started_at IS NOT NULL AND status <> 'cancelled';
CREATE UNIQUE INDEX rescue_dispatches_lead_campaign_cycle_idx
  ON public.rescue_dispatches(lead_id, campaign_id, cycle_started_at)
  WHERE lead_id IS NOT NULL AND campaign_id IS NOT NULL AND cycle_started_at IS NOT NULL AND status <> 'cancelled';
ALTER TABLE public.rescue_campaigns DROP CONSTRAINT IF EXISTS rescue_campaigns_audience_check;
ALTER TABLE public.rescue_campaigns ADD CONSTRAINT rescue_campaigns_audience_check
  CHECK (audience IN ('ex_membro','ex_convidado','convidado','risco'));

CREATE OR REPLACE FUNCTION public.validate_guest_participation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NEW.meeting_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = NEW.meeting_id AND m.team_id IS NOT DISTINCT FROM NEW.team_id
    ) THEN
      RAISE EXCEPTION 'meeting_team_mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_guest_participation_trigger
  BEFORE INSERT OR UPDATE OF team_id, meeting_id ON public.guest_participations
  FOR EACH ROW EXECUTE FUNCTION public.validate_guest_participation();

CREATE OR REPLACE FUNCTION public.sync_invitation_participation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid;
BEGIN
  IF NEW.status <> 'accepted' OR NEW.accepted_by IS NULL OR NEW.invite_purpose = 'whatsapp_community' THEN
    RETURN NEW;
  END IF;
  IF NEW.team_id IS NULL AND NEW.event_id IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO v_lead_id FROM public.crm_leads
  WHERE archived_at IS NULL AND (profile_id = NEW.accepted_by OR invitation_id = NEW.id)
  ORDER BY (profile_id = NEW.accepted_by) DESC, created_at ASC LIMIT 1;
  INSERT INTO public.guest_participations(
    profile_id, lead_id, team_id, meeting_id, invited_by, invitation_id,
    status, confirmed_at, metadata
  ) VALUES (
    NEW.accepted_by, v_lead_id, NEW.team_id, NEW.event_id, NEW.invited_by, NEW.id,
    CASE WHEN NEW.event_id IS NOT NULL THEN 'confirmed' ELSE 'invited' END,
    CASE WHEN NEW.event_id IS NOT NULL THEN COALESCE(NEW.accepted_at, now()) ELSE NULL END,
    jsonb_build_object('source', 'invitation_acceptance', 'invite_purpose', NEW.invite_purpose)
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invitations_sync_participation
  AFTER INSERT OR UPDATE OF status, accepted_by ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.sync_invitation_participation();

CREATE OR REPLACE FUNCTION public.create_guest_invitation(
  _name text DEFAULT NULL,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _team_id uuid DEFAULT NULL,
  _event_id uuid DEFAULT NULL,
  _purpose text DEFAULT 'premium_group',
  _hub_context text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text := NULLIF(lower(trim(_email)), '');
  v_phone_digits text := NULLIF(right(regexp_replace(COALESCE(_phone,''), '\D', '', 'g'), 11), '');
  v_profile public.profiles%ROWTYPE;
  v_role public.app_role;
  v_lead public.crm_leads%ROWTYPE;
  v_inv public.invitations%ROWTYPE;
  v_code text;
  v_target text;
  v_category text;
  v_participation_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT (public.has_role(v_user,'admin') OR public.has_role(v_user,'facilitador') OR public.has_role(v_user,'membro')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _purpose NOT IN ('premium_group','hub_event','whatsapp_community') THEN RAISE EXCEPTION 'invalid_purpose'; END IF;
  IF _purpose = 'premium_group' AND _team_id IS NULL THEN RAISE EXCEPTION 'team_required'; END IF;
  IF _purpose = 'hub_event' AND _event_id IS NULL THEN RAISE EXCEPTION 'event_required'; END IF;
  IF _purpose <> 'premium_group' AND v_email IS NULL THEN RAISE EXCEPTION 'email_required'; END IF;
  IF _team_id IS NOT NULL AND NOT public.has_role(v_user,'admin') AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm WHERE tm.user_id=v_user AND tm.team_id=_team_id
  ) THEN RAISE EXCEPTION 'team_forbidden'; END IF;

  IF v_email IS NOT NULL OR v_phone_digits IS NOT NULL THEN
    SELECT p.* INTO v_profile FROM public.profiles p
    WHERE (v_email IS NOT NULL AND lower(p.email)=v_email)
       OR (v_phone_digits IS NOT NULL AND p.phone_digits=v_phone_digits)
    ORDER BY p.is_active DESC, p.created_at ASC LIMIT 1;
  END IF;
  IF v_profile.id IS NOT NULL THEN
    SELECT role INTO v_role FROM public.user_roles WHERE user_id=v_profile.id LIMIT 1;
    IF v_profile.is_active AND v_role IN ('admin','facilitador','membro') THEN
      RETURN jsonb_build_object('success',false,'action','already_member','profile_id',v_profile.id,'message','Esta pessoa já participa como Membro, Facilitador ou Administrador.');
    END IF;
  END IF;

  IF v_email IS NOT NULL OR v_phone_digits IS NOT NULL THEN
    SELECT l.* INTO v_lead FROM public.crm_leads l
    WHERE l.archived_at IS NULL AND (
      (v_email IS NOT NULL AND lower(l.email)=v_email)
      OR (v_phone_digits IS NOT NULL AND l.phone_digits=v_phone_digits)
    ) ORDER BY l.created_at ASC LIMIT 1;
  END IF;

  IF v_profile.id IS NOT NULL AND v_profile.is_active AND v_role='convidado' AND (_team_id IS NOT NULL OR _event_id IS NOT NULL) THEN
    INSERT INTO public.guest_participations(profile_id,lead_id,team_id,meeting_id,invited_by,status,metadata)
    VALUES (v_profile.id,v_lead.id,_team_id,_event_id,v_user,'invited',jsonb_build_object('source','repeat_invitation','purpose',_purpose))
    ON CONFLICT DO NOTHING RETURNING id INTO v_participation_id;
    IF v_participation_id IS NULL THEN
      SELECT id INTO v_participation_id FROM public.guest_participations
      WHERE profile_id=v_profile.id AND team_id IS NOT DISTINCT FROM _team_id
        AND meeting_id IS NOT DISTINCT FROM _event_id AND status <> 'cancelled' LIMIT 1;
    END IF;
    IF v_lead.id IS NOT NULL THEN
      UPDATE public.crm_leads SET target_team_id=COALESCE(_team_id,target_team_id), updated_at=now() WHERE id=v_lead.id;
      INSERT INTO public.crm_lead_history(lead_id,from_status,to_status,moved_by,reason,event_type,metadata)
      VALUES(v_lead.id,v_lead.status,v_lead.status,v_user,'Nova participação de convidado','guest_participation_invited',jsonb_build_object('participation_id',v_participation_id,'team_id',_team_id,'meeting_id',_event_id));
    END IF;
    RETURN jsonb_build_object('success',true,'action','participation_created','participation_id',v_participation_id,'profile_id',v_profile.id);
  END IF;

  IF v_email IS NOT NULL THEN
    SELECT i.* INTO v_inv FROM public.invitations i
    WHERE lower(i.email)=v_email AND i.status='pending' AND i.expires_at>now()
      AND i.invite_purpose=_purpose
      AND i.team_id IS NOT DISTINCT FROM _team_id
      AND i.event_id IS NOT DISTINCT FROM _event_id
    ORDER BY i.created_at DESC LIMIT 1;
  END IF;
  IF v_inv.id IS NOT NULL THEN
    RETURN jsonb_build_object('success',true,'action','reused','invitation_id',v_inv.id,'code',v_inv.code,'expires_at',v_inv.expires_at);
  END IF;

  LOOP
    v_code := upper(substr(md5(gen_random_uuid()::text),1,8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invitations WHERE code=v_code);
  END LOOP;
  v_target := CASE WHEN _purpose='premium_group' THEN 'comunidade' ELSE 'hub' END;
  v_category := CASE WHEN _purpose='hub_event' THEN 'gente_hub' WHEN _purpose='whatsapp_community' THEN 'comunidade' ELSE 'comunidade' END;
  INSERT INTO public.invitations(code,invited_by,email,name,team_id,invite_target,invite_purpose,event_id,metadata)
  VALUES(v_code,v_user,v_email,NULLIF(trim(_name),''),_team_id,v_target,_purpose,_event_id,
    jsonb_build_object('phone',NULLIF(trim(_phone),''),'hub_context',NULLIF(trim(_hub_context),'')))
  RETURNING * INTO v_inv;

  IF v_email IS NOT NULL THEN
    IF v_lead.id IS NULL THEN
      INSERT INTO public.crm_leads(name,email,phone,source,source_detail,status,invited_by,invitation_id,profile_id,target_team_id,notes,onboarding_category,onboarding_status,metadata)
      VALUES(COALESCE(NULLIF(trim(_name),''),'Convidado'),v_email,NULLIF(trim(_phone),''),'convite_membro',
        CASE WHEN _purpose='premium_group' THEN 'Convite para Grupo Premium' WHEN _purpose='hub_event' THEN 'Convite para evento Gente HUB' ELSE 'Convite Comunidade Gente' END,
        'novo',v_user,v_inv.id,v_profile.id,_team_id,NULLIF(trim(_hub_context),''),v_category,
        CASE WHEN v_profile.id IS NULL THEN 'cadastro_recebido' ELSE 'convidado_ativo' END,
        jsonb_build_object('invite_purpose',_purpose,'event_id',_event_id)) RETURNING * INTO v_lead;
    ELSE
      UPDATE public.crm_leads SET
        name=COALESCE(NULLIF(trim(_name),''),name), phone=COALESCE(NULLIF(trim(_phone),''),phone),
        invited_by=COALESCE(invited_by,v_user), invitation_id=v_inv.id,
        profile_id=COALESCE(profile_id,v_profile.id), target_team_id=COALESCE(_team_id,target_team_id),
        updated_at=now()
      WHERE id=v_lead.id RETURNING * INTO v_lead;
    END IF;
    INSERT INTO public.crm_lead_history(lead_id,from_status,to_status,moved_by,reason,event_type,metadata)
    VALUES(v_lead.id,v_lead.status,v_lead.status,v_user,'Convite criado','invitation_created',jsonb_build_object('invitation_id',v_inv.id,'purpose',_purpose));
  END IF;
  RETURN jsonb_build_object('success',true,'action','created','invitation_id',v_inv.id,'code',v_inv.code,'expires_at',v_inv.expires_at);
END;
$$;
REVOKE ALL ON FUNCTION public.create_guest_invitation(text,text,text,uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_guest_invitation(text,text,text,uuid,uuid,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.renew_guest_invitation(_invitation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_old public.invitations%ROWTYPE; v_new public.invitations%ROWTYPE; v_code text;
BEGIN
  SELECT * INTO v_old FROM public.invitations WHERE id=_invitation_id;
  IF v_old.id IS NULL THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR v_old.invited_by=auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_old.status='accepted' THEN RAISE EXCEPTION 'accepted_invitation_cannot_be_renewed'; END IF;
  IF v_old.status='pending' AND v_old.expires_at>now() THEN
    RETURN jsonb_build_object('success',true,'action','reused','invitation_id',v_old.id,'code',v_old.code,'expires_at',v_old.expires_at);
  END IF;
  LOOP v_code:=upper(substr(md5(gen_random_uuid()::text),1,8)); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.invitations WHERE code=v_code); END LOOP;
  UPDATE public.invitations SET status='expired',metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('renewed_at',now()) WHERE id=v_old.id;
  INSERT INTO public.invitations(code,invited_by,email,name,team_id,invite_target,invite_purpose,event_id,metadata,renewal_of_id)
  VALUES(v_code,v_old.invited_by,v_old.email,v_old.name,v_old.team_id,v_old.invite_target,v_old.invite_purpose,v_old.event_id,
    COALESCE(v_old.metadata,'{}'::jsonb)||jsonb_build_object('renewed_from',v_old.id,'renewed_at',now()),v_old.id)
  RETURNING * INTO v_new;
  UPDATE public.crm_leads SET invitation_id=v_new.id,onboarding_email_status='pending',onboarding_email_sent_at=NULL,updated_at=now()
    WHERE invitation_id=v_old.id AND archived_at IS NULL;
  INSERT INTO public.crm_lead_history(lead_id,from_status,to_status,moved_by,reason,event_type,metadata)
    SELECT id,status,status,auth.uid(),'Convite renovado','invitation_renewed',jsonb_build_object('old_invitation_id',v_old.id,'new_invitation_id',v_new.id)
    FROM public.crm_leads WHERE invitation_id=v_new.id AND archived_at IS NULL;
  RETURN jsonb_build_object('success',true,'action','renewed','invitation_id',v_new.id,'code',v_new.code,'expires_at',v_new.expires_at);
END;
$$;
REVOKE ALL ON FUNCTION public.renew_guest_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_guest_invitation(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.recalculate_crm_attendance(_lead_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile_id uuid; v_email text; v_count integer; v_first timestamptz; v_last timestamptz;
BEGIN
  SELECT profile_id,email INTO v_profile_id,v_email FROM public.crm_leads WHERE id=_lead_id;
  SELECT count(*),min(x.meeting_at),max(x.meeting_at) INTO v_count,v_first,v_last FROM (
    SELECT m.meeting_date::timestamptz AS meeting_at FROM public.meeting_lead_attendances mla JOIN public.meetings m ON m.id=mla.meeting_id WHERE mla.lead_id=_lead_id
    UNION
    SELECT m.meeting_date::timestamptz FROM public.attendances a JOIN public.meetings m ON m.id=a.meeting_id JOIN public.profiles p ON p.id=a.user_id
      WHERE (v_profile_id IS NOT NULL AND a.user_id=v_profile_id) OR (v_profile_id IS NULL AND v_email IS NOT NULL AND lower(p.email)=lower(v_email))
  ) x;
  UPDATE public.crm_leads SET meeting_attendance_count=COALESCE(v_count,0),first_attendance_at=v_first,last_attendance_at=v_last,
    onboarding_status=CASE WHEN COALESCE(v_count,0)>0 THEN 'ja_participou' ELSE onboarding_status END,updated_at=now() WHERE id=_lead_id;
END;
$$;
REVOKE ALL ON FUNCTION public.recalculate_crm_attendance(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_crm_attendance(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_crm_attendance_v350()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=COALESCE(NEW.user_id,OLD.user_id); v_email text; v_lead uuid;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id=v_user;
  FOR v_lead IN SELECT id FROM public.crm_leads WHERE archived_at IS NULL AND (profile_id=v_user OR (v_email IS NOT NULL AND lower(email)=lower(v_email))) LOOP
    PERFORM public.recalculate_crm_attendance(v_lead);
  END LOOP;
  RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE TRIGGER attendances_sync_crm_v350
  AFTER INSERT OR DELETE ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.sync_crm_attendance_v350();

CREATE OR REPLACE FUNCTION public.sync_crm_lead_attendance_v350()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.recalculate_crm_attendance(COALESCE(NEW.lead_id,OLD.lead_id));
  RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE TRIGGER meeting_lead_attendances_sync_crm_v350
  AFTER INSERT OR DELETE ON public.meeting_lead_attendances FOR EACH ROW EXECUTE FUNCTION public.sync_crm_lead_attendance_v350();