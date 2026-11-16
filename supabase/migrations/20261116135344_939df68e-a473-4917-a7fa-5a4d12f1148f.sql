-- @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte
-- Transactional regression: every scenario is rolled back, including CRM writes.
DO $test$
DECLARE u uuid := 'fd50c411-dbb5-4df4-9c9b-63e00d3fb79e';
premium uuid := '8865a4af-1e8f-4480-86be-dd84176c1723';
hub uuid := '2de0b0e5-4a38-4119-8448-108e6edb0e50';
blocked uuid := 'd681ffa0-0772-4770-90dd-0383e103fc81';
before_att integer; before_points integer; before_feed integer; result jsonb; lid uuid; denied boolean := false;
BEGIN
 BEGIN
  SELECT count(*) INTO before_att FROM public.attendances WHERE user_id=u;
  SELECT coalesce(sum(points),0) INTO before_points FROM public.monthly_points;
  SELECT count(*) INTO before_feed FROM public.activity_feed;
  result := public.guest_meetings_dispatch(u,'confirm',jsonb_build_object('meeting_id',premium,'confirm',true));
  IF result->>'success' <> 'true' THEN RAISE EXCEPTION 'Premium confirmation failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.guest_participations WHERE profile_id=u AND meeting_id=premium AND status='confirmed' AND invited_by='1a13d535-92ce-4456-a96f-685ff8c48309') THEN RAISE EXCEPTION 'Specific RSVP or authorship missing'; END IF;
  PERFORM public.guest_meetings_dispatch(u,'confirm',jsonb_build_object('meeting_id',premium,'confirm',true));
  IF (SELECT count(*) FROM public.guest_participations WHERE profile_id=u AND meeting_id=premium AND status='confirmed') <> 1 THEN RAISE EXCEPTION 'Duplicate Premium RSVP'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.guest_meetings_dispatch(u,'agenda','{}')) x WHERE x->>'id'=premium::text AND (x->>'is_attending')::boolean) THEN RAISE EXCEPTION 'Agenda did not read RSVP back'; END IF;
  BEGIN
   PERFORM public.guest_meetings_dispatch(u,'confirm',jsonb_build_object('meeting_id',blocked,'confirm',true));
  EXCEPTION WHEN raise_exception THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Premium without invitation allowed'; END IF;
  PERFORM public.guest_meetings_dispatch(u,'confirm',jsonb_build_object('meeting_id',hub,'confirm',true));
  SELECT lead_id INTO lid FROM public.guest_participations WHERE profile_id=u AND meeting_id=hub AND status='confirmed';
  IF lid IS NULL OR NOT EXISTS(SELECT 1 FROM public.meeting_lead_attendances WHERE meeting_id=hub AND lead_id=lid) THEN RAISE EXCEPTION 'HUB CRM registration missing'; END IF;
  PERFORM public.guest_meetings_dispatch(u,'confirm',jsonb_build_object('meeting_id',hub,'confirm',true));
  IF (SELECT count(*) FROM public.meeting_lead_attendances WHERE meeting_id=hub AND lead_id=lid) <> 1 THEN RAISE EXCEPTION 'Duplicate HUB registration'; END IF;
  IF (SELECT count(*) FROM public.attendances WHERE user_id=u) <> before_att THEN RAISE EXCEPTION 'RSVP created attendance'; END IF;
  IF (SELECT coalesce(sum(points),0) FROM public.monthly_points) <> before_points THEN RAISE EXCEPTION 'RSVP changed points'; END IF;
  IF (SELECT count(*) FROM public.activity_feed) <> before_feed THEN RAISE EXCEPTION 'RSVP published activity'; END IF;
  PERFORM public.guest_meetings_dispatch(u,'confirm',jsonb_build_object('meeting_id',premium,'confirm',false));
  IF NOT public.guest_can_confirm_meeting(u,premium) THEN RAISE EXCEPTION 'Cancellation lost invitation'; END IF;
  PERFORM public.guest_meetings_dispatch(u,'confirm',jsonb_build_object('meeting_id',hub,'confirm',false));
  IF EXISTS(SELECT 1 FROM public.meeting_lead_attendances WHERE meeting_id=hub AND lead_id=lid AND added_by=u) THEN RAISE EXCEPTION 'HUB cancellation retained self registration'; END IF;
  result:=public.confirm_guest_next_meeting(u);
  IF result->>'success'<>'true' OR (SELECT count(*) FROM public.attendances WHERE user_id=u)<>before_att THEN RAISE EXCEPTION 'Signup confirmation failed or wrote attendance'; END IF;
  RAISE EXCEPTION USING ERRCODE='Z0001', MESSAGE='rollback successful regression';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN
  RAISE NOTICE 'PASS: invitation, RSVP readback, idempotency, HUB CRM, cancellation, signup, no attendance/points/feed; all changes rolled back';
 END;
END $test$;