DROP FUNCTION IF EXISTS public.get_public_profile_activity(text);

CREATE OR REPLACE FUNCTION public.get_public_profile_activity(_slug text)
 RETURNS TABLE(id uuid, activity_type text, title text, description text, occurred_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT af.id,
         af.activity_type,
         af.title,
         af.description,
         COALESCE(
           CASE af.activity_type
             WHEN 'gente_em_acao' THEN (
               SELECT g.meeting_date::timestamptz FROM public.gente_em_acao g WHERE g.id = af.reference_id
             )
             WHEN 'business_deal' THEN (
               SELECT bd.deal_date::timestamptz FROM public.business_deals bd WHERE bd.id = af.reference_id
             )
             WHEN 'attendance' THEN (
               SELECT (m.meeting_date + COALESCE(m.meeting_time, '00:00'::time))::timestamptz
               FROM public.meetings m
               WHERE m.id = af.reference_id
                  OR m.id = (SELECT a.meeting_id FROM public.attendances a WHERE a.id = af.reference_id)
               LIMIT 1
             )
             ELSE NULL
           END,
           af.created_at
         ) AS occurred_at
  FROM public.activity_feed af
  JOIN public.profiles p ON p.id = af.user_id
  WHERE p.slug = _slug
    AND p.is_active = true
    AND p.public_profile_enabled = true
    AND af.activity_type IN (
      'attendance', 'gente_em_acao', 'referral', 'testimonial',
      'business_deal', 'business_case', 'matchmaking'
    )
  ORDER BY occurred_at DESC
  LIMIT 12
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_activity(text) TO anon, authenticated;