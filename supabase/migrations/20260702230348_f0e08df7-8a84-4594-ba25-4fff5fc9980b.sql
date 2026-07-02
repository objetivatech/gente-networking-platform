DROP FUNCTION IF EXISTS public.get_public_profile(text);

CREATE FUNCTION public.get_public_profile(_slug text)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  banner_url text,
  company text,
  "position" text,
  business_segment text,
  bio text,
  what_i_do text,
  ideal_client text,
  how_to_refer_me text,
  linkedin_url text,
  instagram_url text,
  website_url text,
  slug text,
  rank text,
  team_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.full_name, p.avatar_url, p.banner_url, p.company, p.position,
    p.business_segment, p.bio, p.what_i_do, p.ideal_client, p.how_to_refer_me,
    p.linkedin_url, p.instagram_url, p.website_url, p.slug, p.rank::text,
    (
      SELECT t.name
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = p.id
      ORDER BY tm.joined_at ASC
      LIMIT 1
    ) AS team_name
  FROM public.profiles p
  WHERE (p.slug = _slug OR p.id::text = _slug)
    AND p.is_active = true
    AND p.public_profile_enabled = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;