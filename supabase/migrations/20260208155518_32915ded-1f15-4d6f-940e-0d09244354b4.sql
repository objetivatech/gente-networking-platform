-- Criar função para desativar membro completamente (remove de grupos + desativa perfil)
CREATE OR REPLACE FUNCTION public.deactivate_member(
  _member_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teams_removed integer;
BEGIN
  -- Verificar se o usuário que está chamando é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem desativar membros');
  END IF;

  -- 1. Remover o membro de todos os grupos
  DELETE FROM team_members WHERE user_id = _member_id;
  GET DIAGNOSTICS teams_removed = ROW_COUNT;

  -- 2. Desativar o perfil
  UPDATE profiles
  SET 
    is_active = false,
    deactivated_at = now(),
    deactivation_reason = _reason
  WHERE id = _member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', _member_id,
    'teams_removed', teams_removed
  );
END;
$$;

-- Criar função para reativar membro
CREATE OR REPLACE FUNCTION public.reactivate_member(
  _member_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário que está chamando é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem reativar membros');
  END IF;

  -- Reativar o perfil
  UPDATE profiles
  SET 
    is_active = true,
    deactivated_at = NULL,
    deactivation_reason = NULL
  WHERE id = _member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', _member_id
  );
END;
$$;