CREATE OR REPLACE FUNCTION public.get_members_health_scores(_days integer DEFAULT 60)
 RETURNS TABLE(
   user_id uuid,
   full_name text,
   avatar_url text,
   company text,
   team_id uuid,
   team_name text,
   meetings_count integer,
   referrals_count integer,
   attendances_count integer,
   testimonials_count integer,
   council_count integer,
   business_cases_count integer,
   last_activity_at timestamp with time zone,
   health_score integer,
   health_level text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role app_role;
  since_date date;
  since_ts timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  since_date := (CURRENT_DATE - _days);
  since_ts := (now() - make_interval(days => _days));

  RETURN QUERY
  WITH members AS (
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'membro'
  ),
  team_of AS (
    SELECT DISTINCT ON (tm.user_id) tm.user_id, tm.team_id
    FROM team_members tm
    ORDER BY tm.user_id, tm.joined_at ASC
  ),
  ga AS (
    SELECT g.user_id, COUNT(*)::int AS cnt, MAX(g.meeting_date)::timestamptz AS last_at
    FROM gente_em_acao g WHERE g.meeting_date >= since_date GROUP BY g.user_id
  ),
  refs AS (
    SELECT r.from_user_id AS user_id, COUNT(*)::int AS cnt, MAX(r.created_at) AS last_at
    FROM referrals r WHERE r.created_at >= since_ts GROUP BY r.from_user_id
  ),
  att AS (
    SELECT a.user_id, COUNT(*)::int AS cnt, MAX(m.meeting_date)::timestamptz AS last_at
    FROM attendances a JOIN meetings m ON m.id = a.meeting_id
    WHERE m.meeting_date >= since_date GROUP BY a.user_id
  ),
  test AS (
    SELECT t.from_user_id AS user_id, COUNT(*)::int AS cnt, MAX(t.created_at) AS last_at
    FROM testimonials t WHERE t.created_at >= since_ts GROUP BY t.from_user_id
  ),
  council AS (
    SELECT cr.user_id, COUNT(*)::int AS cnt, MAX(cr.created_at) AS last_at
    FROM council_replies cr WHERE cr.created_at >= since_ts GROUP BY cr.user_id
  ),
  bc AS (
    SELECT b.user_id, COUNT(*)::int AS cnt, MAX(b.created_at) AS last_at
    FROM business_cases b WHERE b.created_at >= since_ts GROUP BY b.user_id
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.company,
    tof.team_id,
    t.name AS team_name,
    COALESCE(ga.cnt, 0),
    COALESCE(refs.cnt, 0),
    COALESCE(att.cnt, 0),
    COALESCE(test.cnt, 0),
    COALESCE(council.cnt, 0),
    COALESCE(bc.cnt, 0),
    GREATEST(ga.last_at, refs.last_at, att.last_at, test.last_at, council.last_at, bc.last_at) AS last_activity_at,
    LEAST(100,
      COALESCE(ga.cnt,0) * 15
      + COALESCE(refs.cnt,0) * 15
      + COALESCE(att.cnt,0) * 20
      + COALESCE(test.cnt,0) * 10
      + COALESCE(council.cnt,0) * 5
      + COALESCE(bc.cnt,0) * 10
    )::int AS health_score,
    CASE
      WHEN LEAST(100,
        COALESCE(ga.cnt,0) * 15 + COALESCE(refs.cnt,0) * 15 + COALESCE(att.cnt,0) * 20
        + COALESCE(test.cnt,0) * 10 + COALESCE(council.cnt,0) * 5 + COALESCE(bc.cnt,0) * 10) >= 70 THEN 'saudavel'
      WHEN LEAST(100,
        COALESCE(ga.cnt,0) * 15 + COALESCE(refs.cnt,0) * 15 + COALESCE(att.cnt,0) * 20
        + COALESCE(test.cnt,0) * 10 + COALESCE(council.cnt,0) * 5 + COALESCE(bc.cnt,0) * 10) >= 30 THEN 'atencao'
      ELSE 'risco'
    END AS health_level
  FROM members mem
  JOIN profiles p ON p.id = mem.user_id AND p.is_active = true
  LEFT JOIN team_of tof ON tof.user_id = mem.user_id
  LEFT JOIN teams t ON t.id = tof.team_id
  LEFT JOIN ga ON ga.user_id = mem.user_id
  LEFT JOIN refs ON refs.user_id = mem.user_id
  LEFT JOIN att ON att.user_id = mem.user_id
  LEFT JOIN test ON test.user_id = mem.user_id
  LEFT JOIN council ON council.user_id = mem.user_id
  LEFT JOIN bc ON bc.user_id = mem.user_id
  ORDER BY health_score ASC, p.full_name ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_members_health_scores(integer) TO authenticated;