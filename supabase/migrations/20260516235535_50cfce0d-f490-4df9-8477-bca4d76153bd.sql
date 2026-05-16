-- 1) monthly_points: remover policies permissivas; triggers SECURITY DEFINER bypassam RLS
DROP POLICY IF EXISTS "Sistema pode atualizar pontos mensais" ON public.monthly_points;
DROP POLICY IF EXISTS "Sistema pode inserir pontos mensais" ON public.monthly_points;

-- 2) invitations: remover policy pública USING(true)
DROP POLICY IF EXISTS "Convites podem ser lidos pelo código" ON public.invitations;

-- 3) Função pública (segura) para validar um convite por código
--    Retorna apenas os campos necessários para o cadastro do convidado
CREATE OR REPLACE FUNCTION public.get_invitation_by_code(_code text)
RETURNS TABLE (
  id uuid,
  code character varying,
  status character varying,
  email character varying,
  name character varying,
  team_id uuid,
  invited_by uuid,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone,
  accepted_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.code, i.status, i.email, i.name, i.team_id,
         i.invited_by, i.expires_at, i.accepted_at, i.accepted_by
  FROM public.invitations i
  WHERE upper(i.code) = upper(_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_code(text) TO anon, authenticated;