CREATE OR REPLACE FUNCTION public.renew_guest_invitation(_invitation_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_old public.invitations%ROWTYPE; v_new public.invitations%ROWTYPE; v_code text; v_team uuid;
BEGIN
  SELECT * INTO v_old FROM public.invitations WHERE id=_invitation_id;
  IF v_old.id IS NULL THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  SELECT COALESCE(v_old.team_id, (SELECT target_team_id FROM public.crm_leads WHERE invitation_id=v_old.id AND archived_at IS NULL LIMIT 1)) INTO v_team;
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(),'admin') OR v_old.invited_by=auth.uid()
    OR (v_team IS NOT NULL AND public.is_team_facilitator(auth.uid(), v_team))
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_old.status='accepted' THEN RAISE EXCEPTION 'accepted_invitation_cannot_be_renewed'; END IF;
  IF v_old.status='pending' AND v_old.expires_at>now() THEN
    RETURN jsonb_build_object('success',true,'action','reused','invitation_id',v_old.id,'code',v_old.code,'expires_at',v_old.expires_at);
  END IF;
  LOOP v_code:=upper(substr(md5(gen_random_uuid()::text),1,8)); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.invitations WHERE code=v_code); END LOOP;
  UPDATE public.invitations SET status='expired',metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('renewed_at',now()) WHERE id=v_old.id;
  INSERT INTO public.invitations(code,invited_by,email,name,team_id,invite_target,invite_purpose,event_id,metadata,renewal_of_id)
  VALUES(v_code,v_old.invited_by,v_old.email,v_old.name,v_old.team_id,v_old.invite_target,v_old.invite_purpose,v_old.event_id,
    COALESCE(v_old.metadata,'{}'::jsonb)||jsonb_build_object('renewed_from',v_old.id,'renewed_at',now(),'renewed_by',auth.uid()),v_old.id)
  RETURNING * INTO v_new;
  UPDATE public.crm_leads SET invitation_id=v_new.id,onboarding_email_status='pending',onboarding_email_sent_at=NULL,updated_at=now()
    WHERE invitation_id=v_old.id AND archived_at IS NULL;
  INSERT INTO public.crm_lead_history(lead_id,from_status,to_status,moved_by,reason,event_type,metadata)
    SELECT id,status,status,auth.uid(),'Convite renovado','invitation_renewed',jsonb_build_object('old_invitation_id',v_old.id,'new_invitation_id',v_new.id)
    FROM public.crm_leads WHERE invitation_id=v_new.id AND archived_at IS NULL;
  RETURN jsonb_build_object('success',true,'action','renewed','invitation_id',v_new.id,'code',v_new.code,'expires_at',v_new.expires_at);
END;
$function$;