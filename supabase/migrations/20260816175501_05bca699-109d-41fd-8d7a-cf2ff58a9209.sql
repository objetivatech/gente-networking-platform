-- 1) Cases em 4 passos
ALTER TABLE public.business_cases
  ADD COLUMN IF NOT EXISTS client_context text,
  ADD COLUMN IF NOT EXISTS problem text,
  ADD COLUMN IF NOT EXISTS solution text,
  ADD COLUMN IF NOT EXISTS success_result text,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

UPDATE public.business_cases
SET solution = COALESCE(solution, description),
    success_result = COALESCE(success_result, result),
    client_context = COALESCE(client_context, client_name),
    needs_review = true
WHERE solution IS NULL AND success_result IS NULL;

-- 2) Estatísticas públicas do perfil (somente totais agregados)
CREATE OR REPLACE FUNCTION public.get_public_profile_stats(_slug text)
RETURNS TABLE(
  attendances_count integer,
  gente_em_acao_count integer,
  testimonials_count integer,
  referrals_count integer,
  business_total numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT id FROM public.profiles
    WHERE slug = _slug AND is_active = true AND public_profile_enabled = true
    LIMIT 1
  )
  SELECT
    (SELECT COUNT(*)::int FROM public.attendances a, p WHERE a.user_id = p.id),
    (SELECT COUNT(*)::int FROM public.gente_em_acao g, p WHERE g.user_id = p.id),
    (SELECT COUNT(*)::int FROM public.testimonials t, p WHERE t.to_user_id = p.id),
    (SELECT COUNT(*)::int FROM public.referrals r, p WHERE r.from_user_id = p.id),
    (SELECT COALESCE(SUM(d.value), 0)::numeric FROM public.business_deals d, p WHERE d.closed_by_user_id = p.id)
  FROM p;
$$;

-- 3) Cases públicos do perfil
CREATE OR REPLACE FUNCTION public.get_public_profile_cases(_slug text)
RETURNS TABLE(
  id uuid,
  title text,
  client_name text,
  client_context text,
  problem text,
  solution text,
  success_result text,
  image_url text,
  case_type text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.title, c.client_name, c.client_context, c.problem,
         COALESCE(c.solution, c.description) AS solution,
         COALESCE(c.success_result, c.result) AS success_result,
         c.image_url, c.case_type, c.created_at
  FROM public.business_cases c
  JOIN public.profiles pr ON pr.id = c.user_id
  WHERE pr.slug = _slug AND pr.is_active = true AND pr.public_profile_enabled = true
  ORDER BY c.created_at DESC
  LIMIT 24;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_stats(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_cases(text) TO anon, authenticated;