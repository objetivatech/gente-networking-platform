CREATE OR REPLACE FUNCTION public.get_profiles_completeness(_ids uuid[])
RETURNS TABLE(id uuid, percent integer, missing_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  WITH f AS (
    SELECT p.id,
      (CASE WHEN coalesce(btrim(p.avatar_url),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.full_name),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.company),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.position),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.business_segment),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.bio),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.what_i_do),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.ideal_client),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.how_to_refer_me),'')<>'' THEN 1 ELSE 0 END
      +CASE WHEN cardinality(coalesce(p.doors_open,'{}'))>0 THEN 1 ELSE 0 END
      +CASE WHEN cardinality(coalesce(p.doors_seek,'{}'))>0 THEN 1 ELSE 0 END
      +CASE WHEN coalesce(btrim(p.doors_notes),'')<>'' THEN 1 ELSE 0 END) AS filled
    FROM public.profiles p
    WHERE auth.uid() IS NOT NULL AND p.id = ANY(_ids[1:2000])
  )
  SELECT f.id, round(f.filled*100.0/12)::int, 12-f.filled FROM f;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_profiles_completeness(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profiles_completeness(uuid[]) TO authenticated, service_role;