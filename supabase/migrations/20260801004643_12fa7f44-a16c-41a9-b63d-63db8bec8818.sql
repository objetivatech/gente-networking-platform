DROP FUNCTION IF EXISTS public.get_invitation_by_code(text);

CREATE FUNCTION public.get_invitation_by_code(_code text)
RETURNS TABLE(
  id uuid,
  code character varying,
  status character varying,
  email character varying,
  name character varying,
  team_id uuid,
  invited_by uuid,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone,
  accepted_by uuid,
  invite_target text,
  invite_purpose text,
  event_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.code, i.status, i.email, i.name, i.team_id,
         i.invited_by, i.expires_at, i.accepted_at, i.accepted_by,
         i.invite_target, i.invite_purpose, i.event_id
  FROM public.invitations i
  WHERE upper(i.code) = upper(_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_code(text) TO anon, authenticated, service_role;