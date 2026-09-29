DROP TRIGGER IF EXISTS crm_leads_attendance_sync ON public.attendances;

CREATE OR REPLACE FUNCTION public.recalculate_crm_attendance(_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
  _first timestamptz;
  _last timestamptz;
  _profile_id uuid;
BEGIN
  SELECT profile_id INTO _profile_id FROM public.crm_leads WHERE id = _lead_id;

  WITH presence_meetings AS (
    SELECT a.meeting_id
    FROM public.attendances a
    WHERE _profile_id IS NOT NULL AND a.user_id = _profile_id
    UNION
    SELECT mla.meeting_id
    FROM public.meeting_lead_attendances mla
    WHERE mla.lead_id = _lead_id
  ), presence_dates AS (
    SELECT pm.meeting_id, m.meeting_date::timestamptz AS meeting_at
    FROM presence_meetings pm
    JOIN public.meetings m ON m.id = pm.meeting_id
  )
  SELECT count(*)::integer, min(meeting_at), max(meeting_at)
  INTO _count, _first, _last
  FROM presence_dates;

  UPDATE public.crm_leads
  SET meeting_attendance_count = COALESCE(_count, 0),
      first_attendance_at = _first,
      last_attendance_at = _last,
      onboarding_status = CASE
        WHEN COALESCE(_count, 0) > 0 THEN 'ja_participou'
        WHEN profile_id IS NOT NULL THEN 'convidado_ativo'
        ELSE onboarding_status
      END,
      updated_at = now()
  WHERE id = _lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_crm_attendance_v350()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := COALESCE(NEW.user_id, OLD.user_id);
  _meeting_id uuid := COALESCE(NEW.meeting_id, OLD.meeting_id);
  _meeting_at timestamptz;
  _lead record;
BEGIN
  SELECT meeting_date::timestamptz INTO _meeting_at FROM public.meetings WHERE id = _meeting_id;
  FOR _lead IN
    SELECT id FROM public.crm_leads
    WHERE archived_at IS NULL
      AND (profile_id = _user_id OR lower(email) = lower((SELECT email FROM public.profiles WHERE id = _user_id)))
  LOOP
    PERFORM public.recalculate_crm_attendance(_lead.id);
  END LOOP;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.rescue_dispatches
    SET status = 'cancelled', cancel_reason = 'participou_novamente'
    WHERE profile_id = _user_id AND audience = 'convidado' AND status = 'queued'
      AND (_meeting_at IS NULL OR cycle_started_at IS NULL OR cycle_started_at < _meeting_at);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_crm_lead_attendance_v350()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead_id uuid := COALESCE(NEW.lead_id, OLD.lead_id);
  _meeting_id uuid := COALESCE(NEW.meeting_id, OLD.meeting_id);
  _meeting_at timestamptz;
BEGIN
  PERFORM public.recalculate_crm_attendance(_lead_id);
  IF TG_OP = 'INSERT' THEN
    SELECT meeting_date::timestamptz INTO _meeting_at FROM public.meetings WHERE id = _meeting_id;
    UPDATE public.rescue_dispatches
    SET status = 'cancelled', cancel_reason = 'participou_novamente'
    WHERE lead_id = _lead_id AND audience = 'convidado' AND status = 'queued'
      AND (_meeting_at IS NULL OR cycle_started_at IS NULL OR cycle_started_at < _meeting_at);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_rescue_on_guest_participation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rescue_dispatches
  SET status = 'cancelled', cancel_reason = 'nova_participacao'
  WHERE status = 'queued' AND audience IN ('convidado', 'ex_convidado')
    AND ((NEW.profile_id IS NOT NULL AND profile_id = NEW.profile_id)
      OR (NEW.lead_id IS NOT NULL AND lead_id = NEW.lead_id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guest_participations_cancel_rescue ON public.guest_participations;
CREATE TRIGGER guest_participations_cancel_rescue
AFTER INSERT ON public.guest_participations
FOR EACH ROW EXECUTE FUNCTION public.cancel_rescue_on_guest_participation();

REVOKE ALL ON FUNCTION public.recalculate_crm_attendance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_crm_attendance_v350() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_crm_lead_attendance_v350() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_rescue_on_guest_participation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_crm_attendance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_crm_attendance_v350() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_crm_lead_attendance_v350() TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_rescue_on_guest_participation() TO service_role;