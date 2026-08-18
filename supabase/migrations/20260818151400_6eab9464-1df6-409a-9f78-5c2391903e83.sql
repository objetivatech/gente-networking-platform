CREATE OR REPLACE FUNCTION public.get_public_profile_activity(_slug text)
RETURNS TABLE (
  id uuid,
  activity_type text,
  title text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT af.id, af.activity_type, af.title, af.created_at
  FROM public.activity_feed af
  JOIN public.profiles p ON p.id = af.user_id
  WHERE p.slug = _slug
    AND p.is_active = true
    AND p.public_profile_enabled = true
    AND af.activity_type IN (
      'attendance', 'gente_em_acao', 'referral', 'testimonial',
      'business_deal', 'business_case', 'matchmaking'
    )
  ORDER BY af.created_at DESC
  LIMIT 8
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_activity(text) TO anon, authenticated;