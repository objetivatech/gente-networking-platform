
-- 1. Backfill allowed_team_ids for accepted invitations with empty arrays
UPDATE invitations 
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'allowed_team_ids', (SELECT jsonb_agg(id) FROM teams)
)
WHERE status = 'accepted' 
AND (
  metadata->'allowed_team_ids' = '[]'::jsonb
  OR metadata->'allowed_team_ids' IS NULL
  OR NOT (metadata ? 'allowed_team_ids')
);

-- 2. Create RPC promote_guest_to_member
CREATE OR REPLACE FUNCTION public.promote_guest_to_member(
  _guest_id UUID,
  _target_role app_role DEFAULT 'membro',
  _team_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_role app_role;
  guest_current_role app_role;
  caller_is_facilitator_of_team BOOLEAN := false;
BEGIN
  -- Get caller role
  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  
  -- Must be admin or facilitador
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'facilitador') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para promover usuários');
  END IF;
  
  -- Facilitador restrictions
  IF caller_role = 'facilitador' THEN
    -- Can only promote to 'membro'
    IF _target_role != 'membro' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Facilitadores só podem promover para Membro');
    END IF;
    
    -- Must provide a team_id
    IF _team_id IS NULL THEN
      -- Auto-select facilitator's team
      SELECT team_id INTO _team_id FROM team_members 
      WHERE user_id = auth.uid() AND is_facilitator = true LIMIT 1;
    END IF;
    
    -- Verify caller is facilitator of that team
    IF _team_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM team_members 
        WHERE user_id = auth.uid() AND team_id = _team_id AND is_facilitator = true
      ) INTO caller_is_facilitator_of_team;
      
      IF NOT caller_is_facilitator_of_team THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você só pode promover convidados no seu grupo');
      END IF;
    END IF;
  END IF;
  
  -- Get guest current role
  SELECT role INTO guest_current_role FROM user_roles WHERE user_id = _guest_id LIMIT 1;
  
  -- Only promote convidados (or users without role)
  IF guest_current_role IS NOT NULL AND guest_current_role NOT IN ('convidado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este usuário já possui o perfil ' || guest_current_role::text);
  END IF;
  
  -- Upsert role
  INSERT INTO user_roles (user_id, role)
  VALUES (_guest_id, _target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- If user had 'convidado' role and target is different, delete old role
  IF guest_current_role = 'convidado' AND _target_role != 'convidado' THEN
    DELETE FROM user_roles WHERE user_id = _guest_id AND role = 'convidado';
  END IF;
  
  -- Add to team if team_id provided
  IF _team_id IS NOT NULL THEN
    INSERT INTO team_members (user_id, team_id, is_facilitator)
    VALUES (_guest_id, _team_id, _target_role = 'facilitador')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'user_id', _guest_id, 
    'new_role', _target_role::text,
    'team_id', _team_id
  );
END;
$$;
