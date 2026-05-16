-- RPC: mover presença de um convidado para outro encontro futuro
-- Apenas admin (qualquer grupo) ou facilitador (próprio grupo).
-- Mantém integridade: convidado segue podendo confirmar apenas em encontros do seu grupo,
-- e o registro de presença é unicamente transferido (sem duplicação).

CREATE OR REPLACE FUNCTION public.move_guest_attendance(
  _guest_id uuid,
  _from_meeting_id uuid,
  _to_meeting_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role app_role;
  from_team_id uuid;
  to_team_id uuid;
  to_date date;
  guest_name text;
  to_title text;
  is_caller_fac boolean := false;
BEGIN
  -- 1. Permissão
  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'facilitador') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores e facilitadores podem mover convidados');
  END IF;

  -- 2. Convidado precisa ter role 'convidado' (e não ser membro)
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _guest_id AND role = 'convidado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não é um convidado ativo');
  END IF;

  -- 3. Encontros
  SELECT team_id INTO from_team_id FROM meetings WHERE id = _from_meeting_id;
  SELECT team_id, meeting_date, title INTO to_team_id, to_date, to_title FROM meetings WHERE id = _to_meeting_id;

  IF to_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Encontro destino inexistente');
  END IF;

  -- 4. Destino precisa ser futuro (ou hoje)
  IF to_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'O encontro destino precisa ser hoje ou futuro');
  END IF;

  -- 5. Mesmo grupo (preserva fronteira do convidado)
  IF from_team_id IS DISTINCT FROM to_team_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Só é possível mover para um encontro do mesmo grupo');
  END IF;

  -- 6. Facilitador: precisa ser do grupo
  IF caller_role = 'facilitador' THEN
    SELECT EXISTS(
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid() AND team_id = to_team_id AND is_facilitator = true
    ) INTO is_caller_fac;
    IF NOT is_caller_fac THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você só pode mover convidados do seu grupo');
    END IF;
  END IF;

  -- 7. Mover: remove origem, insere destino (idempotente)
  DELETE FROM attendances WHERE meeting_id = _from_meeting_id AND user_id = _guest_id;

  INSERT INTO attendances (meeting_id, user_id)
  VALUES (_to_meeting_id, _guest_id)
  ON CONFLICT DO NOTHING;

  -- 8. Activity feed
  SELECT full_name INTO guest_name FROM profiles WHERE id = _guest_id;
  PERFORM add_activity_feed(
    auth.uid(),
    'guest_move',
    'Convidado movido de encontro',
    COALESCE(guest_name, 'Convidado') || ' foi remanejado para: ' || COALESCE(to_title, 'novo encontro'),
    _guest_id,
    jsonb_build_object('from_meeting_id', _from_meeting_id, 'to_meeting_id', _to_meeting_id),
    to_team_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'guest_id', _guest_id,
    'from_meeting_id', _from_meeting_id,
    'to_meeting_id', _to_meeting_id
  );
END;
$function$;