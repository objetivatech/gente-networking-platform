ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS hub_meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_meeting_lead_attendees(_meeting_ids uuid[])
RETURNS TABLE(meeting_id uuid, lead_id uuid, full_name text, company text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mla.meeting_id, l.id, l.name, l.company
  FROM public.meeting_lead_attendances mla
  JOIN public.crm_leads l ON l.id = mla.lead_id
  WHERE auth.uid() IS NOT NULL
    AND NOT public.is_subscriber(auth.uid())
    AND mla.meeting_id = ANY(_meeting_ids)
    AND l.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.attendances a
      WHERE a.meeting_id = mla.meeting_id AND l.profile_id IS NOT NULL AND a.user_id = l.profile_id
    )
  ORDER BY l.name;
$$;
REVOKE ALL ON FUNCTION public.get_meeting_lead_attendees(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_meeting_lead_attendees(uuid[]) TO authenticated;