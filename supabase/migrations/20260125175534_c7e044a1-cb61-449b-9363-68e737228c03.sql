-- Migration: Fix get_rank_from_points function search_path
CREATE OR REPLACE FUNCTION public.get_rank_from_points(_points integer)
RETURNS public.member_rank
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF _points >= 500 THEN
    RETURN 'diamante';
  ELSIF _points >= 300 THEN
    RETURN 'ouro';
  ELSIF _points >= 150 THEN
    RETURN 'prata';
  ELSIF _points >= 50 THEN
    RETURN 'bronze';
  ELSE
    RETURN 'iniciante';
  END IF;
END;
$$;