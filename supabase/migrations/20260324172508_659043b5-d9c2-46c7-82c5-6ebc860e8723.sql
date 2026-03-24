
-- 1. Tornar accept_invitation idempotente + gravar allowed_team_ids
CREATE OR REPLACE FUNCTION public.accept_invitation(_code character varying, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  team_ids UUID[];
BEGIN
  -- Primeiro: verificar se já foi aceito pelo mesmo usuário (idempotente)
  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'accepted' AND accepted_by = _user_id;
  
  IF FOUND THEN
    -- Já aceito por este usuário — retornar sucesso sem erro
    RETURN jsonb_build_object('success', true, 'invited_by', invitation_record.invited_by, 'already_accepted', true);
  END IF;

  -- Verificar convite pendente
  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'pending' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;
  
  -- Capturar grupos do inviter neste momento (snapshot)
  SELECT ARRAY_AGG(tm.team_id) INTO team_ids
  FROM team_members tm
  WHERE tm.user_id = invitation_record.invited_by;
  
  -- Atualizar convite com status aceito + allowed_team_ids no metadata
  UPDATE invitations
  SET status = 'accepted', 
      accepted_by = _user_id, 
      accepted_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('allowed_team_ids', COALESCE(team_ids, ARRAY[]::UUID[]))
  WHERE id = invitation_record.id;
  
  -- Assign 'convidado' role if user has no role yet
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'convidado')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Add activity to feed
  PERFORM add_activity_feed(
    invitation_record.invited_by,
    'invitation',
    'Novo convidado através de convite',
    'Convite aceito por ' || COALESCE((SELECT full_name FROM profiles WHERE id = _user_id), 'novo convidado'),
    invitation_record.id
  );
  
  RETURN jsonb_build_object('success', true, 'invited_by', invitation_record.invited_by, 'already_accepted', false);
END;
$function$;

-- 2. Backfill: gravar allowed_team_ids nos convites já aceitos que não têm
UPDATE invitations i
SET metadata = COALESCE(i.metadata, '{}'::jsonb) || jsonb_build_object(
  'allowed_team_ids', 
  COALESCE(
    (SELECT ARRAY_AGG(tm.team_id) FROM team_members tm WHERE tm.user_id = i.invited_by),
    ARRAY[]::UUID[]
  )
)
WHERE i.status = 'accepted'
  AND (i.metadata IS NULL OR NOT (i.metadata ? 'allowed_team_ids'));
