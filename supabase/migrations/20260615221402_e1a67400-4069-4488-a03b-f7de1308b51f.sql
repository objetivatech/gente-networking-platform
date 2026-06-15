CREATE OR REPLACE FUNCTION public.create_matchmaking_check(_target_id uuid, _description text DEFAULT NULL::text, _meeting_date date DEFAULT CURRENT_DATE, _image_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role app_role;
  target_role app_role;
  target_name text;
  target_company text;
  new_gea_id uuid;
  ym text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Só membros (admin/facilitador podem registrar mas não pontuam)
  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF caller_role IS NULL OR caller_role = 'convidado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas membros podem usar o MatchMaking');
  END IF;

  IF _target_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não pode se conectar consigo mesmo');
  END IF;

  -- Evitar check duplicado
  IF EXISTS (SELECT 1 FROM matchmaking_connections WHERE member_id = auth.uid() AND target_id = _target_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já registrou conexão com este contato');
  END IF;

  SELECT role INTO target_role FROM user_roles WHERE user_id = _target_id LIMIT 1;
  SELECT full_name, company INTO target_name, target_company FROM profiles WHERE id = _target_id;

  IF target_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato inexistente');
  END IF;

  ym := get_year_month_from_date(_meeting_date);

  -- Criar registro de Gente em Ação (reunião 1x1) — dá 25 pts pela mecânica existente
  IF target_role = 'convidado' OR target_role IS NULL THEN
    INSERT INTO gente_em_acao (user_id, meeting_type, guest_name, guest_company, notes, meeting_date, image_url)
    VALUES (auth.uid(), 'convidado', target_name, target_company,
            COALESCE(_description, 'Conexão via MatchMaking'), _meeting_date, _image_url)
    RETURNING id INTO new_gea_id;
  ELSE
    INSERT INTO gente_em_acao (user_id, meeting_type, partner_id, notes, meeting_date, image_url)
    VALUES (auth.uid(), 'membro', _target_id,
            COALESCE(_description, 'Conexão via MatchMaking'), _meeting_date, _image_url)
    RETURNING id INTO new_gea_id;
  END IF;

  -- Registrar a conexão de MatchMaking
  INSERT INTO matchmaking_connections (member_id, target_id, description, gente_em_acao_id, year_month)
  VALUES (auth.uid(), _target_id, _description, new_gea_id, ym);

  -- Activity feed
  PERFORM add_activity_feed(
    auth.uid(), 'matchmaking',
    (SELECT full_name FROM profiles WHERE id = auth.uid()) || ' realizou uma conexão de MatchMaking',
    'Conexão com ' || target_name,
    new_gea_id, '{}'::jsonb, NULL::uuid
  );

  -- Recalcular pontos do mês (inclui +10 do MatchMaking)
  PERFORM update_all_monthly_points_for_user(auth.uid(), ym);

  RETURN jsonb_build_object(
    'success', true,
    'gente_em_acao_id', new_gea_id,
    'target_id', _target_id
  );
END;
$function$;