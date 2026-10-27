-- Fluxo enxuto de convites v3.56.0

CREATE OR REPLACE FUNCTION public.get_invitation_welcome(_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inv public.invitations%ROWTYPE; host record; tname text; m record; v_team uuid;
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE upper(code) = upper(_code) LIMIT 1;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'reason', 'not_found'); END IF;
  IF inv.status <> 'pending' THEN RETURN jsonb_build_object('valid', false, 'reason', 'used'); END IF;
  IF inv.expires_at <= now() THEN RETURN jsonb_build_object('valid', false, 'reason', 'expired'); END IF;
  SELECT full_name, company, avatar_url INTO host FROM public.profiles WHERE id = inv.invited_by;
  v_team := inv.team_id;
  IF v_team IS NULL AND inv.event_id IS NULL THEN
    SELECT team_id INTO v_team FROM public.team_members WHERE user_id = inv.invited_by ORDER BY joined_at ASC LIMIT 1;
  END IF;
  SELECT name INTO tname FROM public.teams WHERE id = v_team;
  IF inv.event_id IS NOT NULL THEN
    SELECT id, title, meeting_date, meeting_time, location INTO m FROM public.meetings WHERE id = inv.event_id;
  ELSIF v_team IS NOT NULL THEN
    SELECT id, title, meeting_date, meeting_time, location INTO m FROM public.meetings
    WHERE team_id = v_team AND meeting_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    ORDER BY meeting_date, meeting_time NULLS LAST LIMIT 1;
  END IF;
  RETURN jsonb_build_object(
    'valid', true, 'code', inv.code, 'name', inv.name, 'email', inv.email,
    'invite_purpose', inv.invite_purpose, 'expires_at', inv.expires_at,
    'host_name', host.full_name, 'host_company', host.company, 'host_avatar', host.avatar_url,
    'team_name', tname,
    'meeting', CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', m.id, 'title', m.title, 'meeting_date', m.meeting_date, 'meeting_time', m.meeting_time, 'location', m.location) END
  );
END $$;
REVOKE ALL ON FUNCTION public.get_invitation_welcome(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invitation_welcome(text) TO anon, authenticated, service_role;

-- Confirmação automática no próximo encontro (somente servidor)
CREATE OR REPLACE FUNCTION public.confirm_guest_next_meeting(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inv public.invitations%ROWTYPE; m record; v_team uuid;
BEGIN
  SELECT * INTO inv FROM public.invitations
  WHERE accepted_by = _user_id AND status = 'accepted' AND COALESCE(metadata->>'superseded','false') <> 'true'
  ORDER BY accepted_at DESC LIMIT 1;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'no_invitation'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'convidado') THEN
    RETURN jsonb_build_object('success', true, 'meeting', NULL);
  END IF;
  v_team := inv.team_id;
  IF inv.event_id IS NOT NULL THEN
    SELECT id, team_id, title, meeting_date, meeting_time, location INTO m FROM public.meetings
    WHERE id = inv.event_id AND meeting_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  ELSIF v_team IS NOT NULL THEN
    SELECT id, team_id, title, meeting_date, meeting_time, location INTO m FROM public.meetings
    WHERE team_id = v_team AND meeting_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    ORDER BY meeting_date, meeting_time NULLS LAST LIMIT 1;
  END IF;
  IF m.id IS NULL THEN RETURN jsonb_build_object('success', true, 'meeting', NULL); END IF;

  INSERT INTO public.attendances(meeting_id, user_id) VALUES (m.id, _user_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.guest_participations(profile_id, team_id, meeting_id, invited_by, invitation_id, status, confirmed_at, metadata)
  VALUES (_user_id, m.team_id, m.id, inv.invited_by, inv.id, 'confirmed', now(), '{"source":"instant_signup"}'::jsonb)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'meeting', jsonb_build_object(
    'id', m.id, 'title', m.title, 'meeting_date', m.meeting_date, 'meeting_time', m.meeting_time, 'location', m.location));
END $$;
REVOKE ALL ON FUNCTION public.confirm_guest_next_meeting(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_guest_next_meeting(uuid) TO service_role;

-- Reconvite por papel, preservando a autoria original
CREATE OR REPLACE FUNCTION public.reinvite_guest_to_meeting(_guest_id uuid, _meeting_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid := auth.uid(); m record; original uuid; g record; tname text; pid uuid; allowed boolean := false;
BEGIN
  IF caller IS NULL OR NOT public.is_active_user(caller) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _guest_id AND role = 'convidado') THEN
    RAISE EXCEPTION 'Esta pessoa não é um convidado ativo';
  END IF;
  SELECT id, team_id, title, meeting_date, meeting_time, location INTO m FROM public.meetings WHERE id = _meeting_id;
  IF m.id IS NULL OR m.meeting_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'Escolha um encontro de hoje ou futuro';
  END IF;

  SELECT invited_by INTO original FROM public.invitations
  WHERE accepted_by = _guest_id AND status = 'accepted' ORDER BY accepted_at ASC LIMIT 1;
  IF original IS NULL THEN
    SELECT invited_by INTO original FROM public.guest_participations WHERE profile_id = _guest_id ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF public.has_role(caller, 'admin') THEN
    allowed := true;
  ELSIF public.has_role(caller, 'facilitador') AND m.team_id IS NOT NULL AND public.is_team_facilitator(caller, m.team_id) THEN
    allowed := true;
  ELSIF m.team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.team_members WHERE user_id = caller AND team_id = m.team_id)
    AND (original = caller OR EXISTS (SELECT 1 FROM public.guest_participations WHERE profile_id = _guest_id AND invited_by = caller)) THEN
    allowed := true;
  END IF;
  IF NOT allowed THEN RAISE EXCEPTION 'Você não pode reconvidar esta pessoa para este encontro'; END IF;

  INSERT INTO public.guest_participations(profile_id, team_id, meeting_id, invited_by, status, metadata)
  VALUES (_guest_id, m.team_id, m.id, COALESCE(original, caller), 'invited',
          jsonb_build_object('source', 'reinvite', 'reinvited_by', caller))
  ON CONFLICT DO NOTHING RETURNING id INTO pid;
  IF pid IS NULL THEN
    SELECT id INTO pid FROM public.guest_participations
    WHERE profile_id = _guest_id AND meeting_id = m.id AND status <> 'cancelled' LIMIT 1;
  END IF;

  SELECT full_name, phone INTO g FROM public.profiles WHERE id = _guest_id;
  SELECT name INTO tname FROM public.teams WHERE id = m.team_id;
  RETURN jsonb_build_object('success', true, 'participation_id', pid,
    'guest_name', g.full_name, 'guest_phone', g.phone, 'team_name', tname,
    'meeting_title', m.title, 'meeting_date', m.meeting_date, 'meeting_time', m.meeting_time, 'location', m.location);
END $$;
REVOKE ALL ON FUNCTION public.reinvite_guest_to_meeting(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reinvite_guest_to_meeting(uuid, uuid) TO authenticated, service_role;

-- Admin pode mover convidado entre Grupos
CREATE OR REPLACE FUNCTION public.move_guest_attendance(_guest_id uuid, _from_meeting_id uuid, _to_meeting_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  caller_role app_role; from_team_id uuid; to_team_id uuid; to_date date; guest_name text; to_title text;
  is_caller_fac boolean := false; is_admin boolean; original uuid;
BEGIN
  is_admin := public.has_role(auth.uid(), 'admin');
  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','facilitador') LIMIT 1;
  IF caller_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores e facilitadores podem mover convidados');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _guest_id AND role = 'convidado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não é um convidado ativo');
  END IF;
  SELECT team_id INTO from_team_id FROM meetings WHERE id = _from_meeting_id;
  SELECT team_id, meeting_date, title INTO to_team_id, to_date, to_title FROM meetings WHERE id = _to_meeting_id;
  IF to_date IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Encontro destino inexistente'); END IF;
  IF to_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RETURN jsonb_build_object('success', false, 'error', 'O encontro destino precisa ser hoje ou futuro');
  END IF;
  IF NOT is_admin AND from_team_id IS DISTINCT FROM to_team_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Só o Admin pode mover para um encontro de outro grupo');
  END IF;
  IF NOT is_admin THEN
    SELECT EXISTS(SELECT 1 FROM team_members WHERE user_id = auth.uid() AND team_id = to_team_id AND is_facilitator = true) INTO is_caller_fac;
    IF NOT is_caller_fac THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você só pode mover convidados do seu grupo');
    END IF;
  END IF;

  DELETE FROM attendances WHERE meeting_id = _from_meeting_id AND user_id = _guest_id;
  INSERT INTO attendances (meeting_id, user_id) VALUES (_to_meeting_id, _guest_id) ON CONFLICT DO NOTHING;

  SELECT invited_by INTO original FROM invitations WHERE accepted_by = _guest_id AND status = 'accepted' ORDER BY accepted_at ASC LIMIT 1;
  INSERT INTO guest_participations(profile_id, team_id, meeting_id, invited_by, status, confirmed_at, metadata)
  VALUES (_guest_id, to_team_id, _to_meeting_id, COALESCE(original, auth.uid()), 'confirmed', now(),
          jsonb_build_object('source', 'moved', 'moved_by', auth.uid(), 'from_meeting_id', _from_meeting_id))
  ON CONFLICT DO NOTHING;

  SELECT full_name INTO guest_name FROM profiles WHERE id = _guest_id;
  PERFORM add_activity_feed(auth.uid(), 'guest_move', 'Convidado movido de encontro',
    COALESCE(guest_name, 'Convidado') || ' foi remanejado para: ' || COALESCE(to_title, 'novo encontro'),
    _guest_id, jsonb_build_object('from_meeting_id', _from_meeting_id, 'to_meeting_id', _to_meeting_id), to_team_id);

  RETURN jsonb_build_object('success', true, 'guest_id', _guest_id, 'from_meeting_id', _from_meeting_id, 'to_meeting_id', _to_meeting_id);
END;
$function$;