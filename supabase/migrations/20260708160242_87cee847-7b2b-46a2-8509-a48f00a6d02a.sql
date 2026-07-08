CREATE OR REPLACE FUNCTION public.get_public_profile_slugs()
RETURNS TABLE (slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.slug
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.public_profile_enabled = true
    AND p.slug IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_slugs() TO anon, authenticated;