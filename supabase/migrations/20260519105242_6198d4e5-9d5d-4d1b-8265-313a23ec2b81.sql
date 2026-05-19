CREATE OR REPLACE FUNCTION public.get_guests_directory()
RETURNS TABLE (
  id uuid,
  full_name text,
  slug text,
  email text,
  phone text,
  company text,
  avatar_url text,
  business_segment text,
  role_current app_role,
  status text,
  team_id uuid,
  team_name text,
  team_color text,
  invited_by_id uuid,
  invited_by_name text,
  invited_at timestamptz,
  attendance_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

  IF caller_role IS NULL OR caller_role NOT IN ('admin','facilitador','membro') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH latest_inv AS (
    SELECT DISTINCT ON (i.accepted_by)
      i.accepted_by AS user_id,
      i.invited_by,
      i.team_id,
      i.created_at,
      i.accepted_at
    FROM invitations i
    WHERE i.status = 'accepted' AND i.accepted_by IS NOT NULL
    ORDER BY i.accepted_by, i.accepted_at DESC NULLS LAST, i.created_at DESC
  ),
  att AS (
    SELECT a.user_id, COUNT(*)::int AS cnt
    FROM attendances a
    WHERE a.user_id IN (SELECT user_id FROM latest_inv)
    GROUP BY a.user_id
  )
  SELECT
    p.id,
    p.full_name,
    p.slug,
    p.email,
    p.phone,
    p.company,
    p.avatar_url,
    p.business_segment,
    ur.role AS role_current,
    CASE
      WHEN ur.role IS NOT NULL AND ur.role <> 'convidado' THEN 'promoted'
      WHEN COALESCE(att.cnt, 0) > 0 THEN 'attended'
      ELSE 'awaiting_first'
    END AS status,
    li.team_id,
    t.name AS team_name,
    t.color AS team_color,
    li.invited_by AS invited_by_id,
    ip.full_name AS invited_by_name,
    li.created_at AS invited_at,
    COALESCE(att.cnt, 0) AS attendance_count
  FROM latest_inv li
  JOIN profiles p ON p.id = li.user_id AND p.is_active = true
  LEFT JOIN user_roles ur ON ur.user_id = li.user_id
  LEFT JOIN teams t ON t.id = li.team_id
  LEFT JOIN profiles ip ON ip.id = li.invited_by
  LEFT JOIN att ON att.user_id = li.user_id
  ORDER BY p.full_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_guests_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guests_directory() TO authenticated;

INSERT INTO public.system_changelog (version, title, description, category, changes)
VALUES (
  'v3.9.0',
  'Diretório de convidados acessível a membros + matriz de permissões',
  'Corrige bug em que membros deixaram de ver o diretório de convidados após v3.7.0. Introduz RPC segura get_guests_directory e camada central de matriz de permissões com testes de regressão.',
  'fix',
  '[
    "Nova RPC get_guests_directory (SECURITY DEFINER) com checagem explícita de role",
    "/convidados volta a ser visível para admin, facilitador e membro",
    "Convidado segue bloqueado",
    "Matriz central de permissões em src/lib/access-control.ts",
    "Testes Vitest de regressão para regras críticas de acesso"
  ]'::jsonb
);