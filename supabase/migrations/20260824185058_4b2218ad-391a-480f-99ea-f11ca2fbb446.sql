
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS phone_digits text
  GENERATED ALWAYS AS (NULLIF(right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 11), '')) STORED;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_digits text
  GENERATED ALWAYS AS (NULLIF(right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 11), '')) STORED;

CREATE INDEX IF NOT EXISTS idx_crm_leads_phone_digits ON public.crm_leads (phone_digits);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email_lower ON public.crm_leads (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_phone_digits ON public.profiles (phone_digits);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));

-- União de leads duplicados preservando histórico
CREATE OR REPLACE FUNCTION public.crm_merge_leads(_keep_id uuid, _dup_id uuid, _reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  keep_rec RECORD;
  dup_rec RECORD;
BEGIN
  IF _keep_id = _dup_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contatos iguais');
  END IF;

  SELECT * INTO keep_rec FROM crm_leads WHERE id = _keep_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato principal não encontrado');
  END IF;

  SELECT * INTO dup_rec FROM crm_leads WHERE id = _dup_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato duplicado não encontrado');
  END IF;

  UPDATE crm_leads
  SET phone = COALESCE(keep_rec.phone, dup_rec.phone),
      company = COALESCE(keep_rec.company, dup_rec.company),
      business_segment = COALESCE(keep_rec.business_segment, dup_rec.business_segment),
      target_team_id = COALESCE(keep_rec.target_team_id, dup_rec.target_team_id),
      profile_id = COALESCE(keep_rec.profile_id, dup_rec.profile_id),
      invited_by = COALESCE(keep_rec.invited_by, dup_rec.invited_by),
      notes = COALESCE(NULLIF(keep_rec.notes, ''), dup_rec.notes),
      metadata = COALESCE(dup_rec.metadata, '{}'::jsonb) || COALESCE(keep_rec.metadata, '{}'::jsonb)
        || jsonb_build_object(
             'merged_lead_ids',
             COALESCE(keep_rec.metadata->'merged_lead_ids', '[]'::jsonb) || to_jsonb(ARRAY[_dup_id::text]),
             'merged_emails',
             COALESCE(keep_rec.metadata->'merged_emails', '[]'::jsonb) || to_jsonb(ARRAY[dup_rec.email])
           ),
      updated_at = now()
  WHERE id = _keep_id;

  -- transfere vínculos
  UPDATE meeting_lead_attendances a
  SET lead_id = _keep_id
  WHERE a.lead_id = _dup_id
    AND NOT EXISTS (
      SELECT 1 FROM meeting_lead_attendances b
      WHERE b.lead_id = _keep_id AND b.meeting_id = a.meeting_id
    );
  DELETE FROM meeting_lead_attendances WHERE lead_id = _dup_id;

  UPDATE billing_subscriptions SET lead_id = _keep_id WHERE lead_id = _dup_id;
  UPDATE billing_charges SET lead_id = _keep_id WHERE lead_id = _dup_id;
  UPDATE hub_billing_events SET lead_id = _keep_id WHERE lead_id = _dup_id;
  UPDATE rescue_dispatches SET lead_id = _keep_id WHERE lead_id = _dup_id;
  UPDATE crm_lead_history SET lead_id = _keep_id WHERE lead_id = _dup_id;

  -- arquiva o duplicado (nunca apaga)
  UPDATE crm_leads
  SET archived_at = now(),
      status = 'perdido',
      metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object('merged_into', _keep_id, 'merged_at', now(), 'merge_reason', _reason),
      updated_at = now()
  WHERE id = _dup_id;

  INSERT INTO crm_lead_history (lead_id, from_status, to_status, moved_by, reason, event_type, metadata)
  VALUES (
    _keep_id, keep_rec.status, keep_rec.status, auth.uid(),
    COALESCE(_reason, 'União automática de contatos duplicados'),
    'lead_merged',
    jsonb_build_object('merged_lead_id', _dup_id, 'merged_email', dup_rec.email, 'merged_phone', dup_rec.phone)
  );

  RETURN jsonb_build_object('success', true, 'lead_id', _keep_id, 'merged_lead_id', _dup_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.crm_merge_leads(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_merge_leads(uuid, uuid, text) TO service_role;
