ALTER TABLE public.matchmaking_connections
  DROP CONSTRAINT IF EXISTS matchmaking_connections_member_id_target_id_key;

CREATE INDEX IF NOT EXISTS idx_matchmaking_member_target_created
  ON public.matchmaking_connections (member_id, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.matchmaking_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_type text NOT NULL DEFAULT 'manual',
  notes text,
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.matchmaking_attempts TO authenticated;
GRANT ALL ON public.matchmaking_attempts TO service_role;

ALTER TABLE public.matchmaking_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros veem suas tentativas" ON public.matchmaking_attempts;
CREATE POLICY "Membros veem suas tentativas"
ON public.matchmaking_attempts FOR SELECT TO authenticated
USING (member_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'facilitador'));

DROP POLICY IF EXISTS "Membros criam suas tentativas" ON public.matchmaking_attempts;
CREATE POLICY "Membros criam suas tentativas"
ON public.matchmaking_attempts FOR INSERT TO authenticated
WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "Membros removem suas tentativas" ON public.matchmaking_attempts;
CREATE POLICY "Membros removem suas tentativas"
ON public.matchmaking_attempts FOR DELETE TO authenticated
USING (member_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_matchmaking_attempts_member_target
  ON public.matchmaking_attempts (member_id, target_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.register_matchmaking_attempt(
  _target_id uuid,
  _attempt_type text DEFAULT 'manual',
  _notes text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role app_role;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF caller_role IS NULL OR caller_role = 'convidado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas membros podem usar o MatchMaking');
  END IF;

  IF _target_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato inválido');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _target_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato inexistente');
  END IF;

  INSERT INTO matchmaking_attempts (member_id, target_id, attempt_type, notes, reference_id)
  VALUES (auth.uid(), _target_id,
          CASE WHEN _attempt_type IN ('manual', 'schedule_request') THEN _attempt_type ELSE 'manual' END,
          _notes, _reference_id)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('success', true, 'id', new_id);
END;
$function$;

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
  last_conn timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF caller_role IS NULL OR caller_role = 'convidado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas membros podem usar o MatchMaking');
  END IF;

  IF _target_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não pode se conectar consigo mesmo');
  END IF;

  -- Fila de espera: só bloqueia se houver conexão efetiva nos últimos 60 dias
  SELECT max(created_at) INTO last_conn
  FROM matchmaking_connections
  WHERE member_id = auth.uid() AND target_id = _target_id;

  IF last_conn IS NOT NULL AND last_conn > now() - interval '60 days' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este contato está em fila de espera. Nova conexão liberada em ' ||
               to_char((last_conn + interval '60 days')::date, 'DD/MM/YYYY') || '.'
    );
  END IF;

  SELECT role INTO target_role FROM user_roles WHERE user_id = _target_id LIMIT 1;
  SELECT full_name, company INTO target_name, target_company FROM profiles WHERE id = _target_id;

  IF target_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato inexistente');
  END IF;

  ym := get_year_month_from_date(_meeting_date);

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

  INSERT INTO matchmaking_connections (member_id, target_id, description, gente_em_acao_id, year_month)
  VALUES (auth.uid(), _target_id, _description, new_gea_id, ym);

  PERFORM add_activity_feed(
    auth.uid(), 'matchmaking',
    (SELECT full_name FROM profiles WHERE id = auth.uid()) || ' realizou uma conexão de MatchMaking',
    'Conexão com ' || target_name,
    new_gea_id, '{}'::jsonb, NULL::uuid
  );

  PERFORM update_all_monthly_points_for_user(auth.uid(), ym);

  RETURN jsonb_build_object(
    'success', true,
    'gente_em_acao_id', new_gea_id,
    'target_id', _target_id
  );
END;
$function$;