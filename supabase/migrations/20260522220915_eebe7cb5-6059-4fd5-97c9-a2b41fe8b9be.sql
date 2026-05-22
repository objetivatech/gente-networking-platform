
CREATE OR REPLACE FUNCTION public.downgrade_member_to_guest(_member_id uuid, _reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  previous_role app_role;
  previous_team_id uuid;
  teams_removed integer := 0;
  has_invitation boolean;
  member_name text;
  team_name text;
BEGIN
  -- 1. Apenas admin pode executar
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem rebaixar membros');
  END IF;

  -- 2. Validar role atual
  SELECT role INTO previous_role FROM user_roles WHERE user_id = _member_id LIMIT 1;

  IF previous_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário sem role definida');
  END IF;

  IF previous_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível rebaixar um administrador');
  END IF;

  IF previous_role = 'convidado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já é convidado');
  END IF;

  IF previous_role NOT IN ('membro', 'facilitador') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role atual não suporta rebaixamento');
  END IF;

  -- 3. Capturar último grupo (snapshot)
  SELECT team_id INTO previous_team_id
  FROM team_members
  WHERE user_id = _member_id
  ORDER BY joined_at ASC
  LIMIT 1;

  -- 4. Remover de todos os grupos
  DELETE FROM team_members WHERE user_id = _member_id;
  GET DIAGNOSTICS teams_removed = ROW_COUNT;

  -- 5. Trocar role para convidado
  DELETE FROM user_roles WHERE user_id = _member_id;
  INSERT INTO user_roles (user_id, role) VALUES (_member_id, 'convidado');

  -- 6. Garantir registro em invitations para preservar vínculo histórico
  SELECT EXISTS(
    SELECT 1 FROM invitations
    WHERE accepted_by = _member_id AND status = 'accepted'
  ) INTO has_invitation;

  IF has_invitation THEN
    UPDATE invitations
    SET team_id = COALESCE(previous_team_id, team_id),
        metadata = COALESCE(metadata, '{}'::jsonb) ||
                   jsonb_build_object(
                     'downgraded_at', now(),
                     'downgraded_by', auth.uid(),
                     'downgrade_reason', _reason,
                     'previous_role', previous_role::text,
                     'allowed_team_ids', CASE
                       WHEN previous_team_id IS NOT NULL
                       THEN jsonb_build_array(previous_team_id)
                       ELSE '[]'::jsonb
                     END
                   )
    WHERE accepted_by = _member_id AND status = 'accepted';
  ELSE
    -- Convite sintético para membros originais sem convite anterior
    INSERT INTO invitations (
      code, status, invited_by, accepted_by, accepted_at,
      team_id, expires_at, metadata, email, name
    )
    SELECT
      'DG-' || substr(gen_random_uuid()::text, 1, 12),
      'accepted',
      auth.uid(),
      _member_id,
      now(),
      previous_team_id,
      now() + interval '1 year',
      jsonb_build_object(
        'synthetic', true,
        'downgraded_at', now(),
        'downgraded_by', auth.uid(),
        'downgrade_reason', _reason,
        'previous_role', previous_role::text,
        'allowed_team_ids', CASE
          WHEN previous_team_id IS NOT NULL
          THEN jsonb_build_array(previous_team_id)
          ELSE '[]'::jsonb
        END
      ),
      p.email,
      p.full_name
    FROM profiles p WHERE p.id = _member_id;
  END IF;

  -- 7. Recalcular pontos do mês corrente (vai zerar, pois não está mais em team_members)
  PERFORM update_all_monthly_points_for_user(_member_id);

  -- 8. Log no activity feed
  SELECT full_name INTO member_name FROM profiles WHERE id = _member_id;
  SELECT name INTO team_name FROM teams WHERE id = previous_team_id;

  PERFORM add_activity_feed(
    auth.uid(),
    'member_downgrade',
    'Membro rebaixado para convidado',
    COALESCE(member_name, 'Membro') ||
      ' deixou ' || COALESCE('o grupo ' || team_name, 'a comunidade') ||
      CASE WHEN _reason IS NOT NULL AND _reason <> '' THEN ' — ' || _reason ELSE '' END,
    _member_id,
    jsonb_build_object(
      'previous_role', previous_role::text,
      'previous_team_id', previous_team_id,
      'reason', _reason
    ),
    previous_team_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'member_id', _member_id,
    'previous_role', previous_role::text,
    'previous_team_id', previous_team_id,
    'teams_removed', teams_removed
  );
END;
$function$;
