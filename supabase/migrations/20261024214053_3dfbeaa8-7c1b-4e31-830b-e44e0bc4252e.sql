-- Bloco 2 · Fase 3 — Vitrine da Comunidade e franquia do MatchMaking

CREATE OR REPLACE FUNCTION public.get_community_showcase()
RETURNS TABLE (
  id uuid,
  full_name text,
  company text,
  "position" text,
  avatar_url text,
  business_segment text,
  what_i_do text,
  ideal_client text,
  tags text[],
  role text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer uuid := auth.uid();
  viewer_active boolean;
  viewer_allowed boolean;
BEGIN
  IF viewer IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT p.is_active INTO viewer_active
  FROM public.profiles p
  WHERE p.id = viewer;

  viewer_allowed := COALESCE(viewer_active, false) AND (
    public.is_subscriber(viewer)
    OR (
      public.has_role(viewer, 'convidado')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = viewer AND ur.role IN ('admin', 'facilitador', 'membro')
      )
    )
  );

  IF NOT viewer_allowed THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.company,
    p.position,
    p.avatar_url,
    p.business_segment,
    p.what_i_do,
    p.ideal_client,
    COALESCE(p.tags, ARRAY[]::text[]),
    CASE
      WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'assinante') THEN 'assinante'
      ELSE 'convidado'
    END AS role
  FROM public.profiles p
  WHERE p.id <> viewer
    AND public.is_showcase_profile(p.id)
  ORDER BY p.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_matchmaking_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  company text,
  "position" text,
  avatar_url text,
  business_segment text,
  what_i_do text,
  ideal_client text,
  tags text[],
  role text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer uuid := auth.uid();
  viewer_active boolean;
BEGIN
  IF viewer IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT p.is_active INTO viewer_active
  FROM public.profiles p
  WHERE p.id = viewer;

  IF NOT COALESCE(viewer_active, false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF public.is_subscriber(viewer) THEN
    RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.company,
      p.position,
      p.avatar_url,
      p.business_segment,
      p.what_i_do,
      p.ideal_client,
      COALESCE(p.tags, ARRAY[]::text[]),
      CASE
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'assinante') THEN 'assinante'
        ELSE 'convidado'
      END AS role
    FROM public.profiles p
    WHERE p.id <> viewer
      AND public.is_showcase_profile(p.id)
    ORDER BY p.full_name;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = viewer AND ur.role IN ('admin', 'facilitador', 'membro')
  ) THEN
    RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.company,
      p.position,
      p.avatar_url,
      p.business_segment,
      p.what_i_do,
      p.ideal_client,
      COALESCE(p.tags, ARRAY[]::text[]),
      CASE
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'facilitador') THEN 'facilitador'
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'membro') THEN 'membro'
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'assinante') THEN 'assinante'
        ELSE 'convidado'
      END AS role
    FROM public.profiles p
    WHERE p.id <> viewer
      AND p.is_active
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id AND ur.role = 'admin'
      )
    ORDER BY p.full_name;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public._matchmaking_draw_state(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ym text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
  renewal_date date := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 month')::date;
  is_admin boolean;
  is_facilitator boolean;
  is_member boolean;
  is_subscriber boolean;
  profile_active boolean;
  subscription_id uuid;
  plan_name text;
  quota integer;
  used integer;
  metered boolean := false;
  can_draw boolean := false;
  reason text := NULL;
  target_ids jsonb;
BEGIN
  SELECT p.is_active INTO profile_active
  FROM public.profiles p
  WHERE p.id = _user_id;

  is_admin := public.has_role(_user_id, 'admin');
  is_facilitator := public.has_role(_user_id, 'facilitador');
  is_member := public.has_role(_user_id, 'membro');
  is_subscriber := public.is_subscriber(_user_id);

  SELECT COUNT(*)::integer,
         COALESCE(jsonb_agg(e.reference_id ORDER BY e.created_at) FILTER (WHERE e.reference_id IS NOT NULL), '[]'::jsonb)
    INTO used, target_ids
  FROM public.usage_quota_events e
  WHERE e.user_id = _user_id
    AND e.feature_key = 'matchmaking_draw'
    AND e.year_month = ym;

  IF NOT COALESCE(profile_active, false) THEN
    reason := 'Seu perfil está inativo.';
  ELSIF is_admin OR is_facilitator THEN
    can_draw := true;
  ELSIF is_member OR is_subscriber THEN
    SELECT s.id, p.name,
           CASE
             WHEN jsonb_typeof(p.features -> 'matchmaking_monthly_quota') = 'number'
               THEN (p.features ->> 'matchmaking_monthly_quota')::integer
             ELSE NULL
           END
      INTO subscription_id, plan_name, quota
    FROM public.billing_subscriptions s
    JOIN public.billing_plans p ON p.id = s.plan_id
    WHERE s.profile_id = _user_id
      AND s.status IN ('active', 'trialing')
      AND p.active
    ORDER BY s.start_date DESC, s.created_at DESC
    LIMIT 1;

    IF quota IS NOT NULL THEN
      metered := true;
      can_draw := used < quota;
      IF quota <= 0 THEN
        reason := 'Seu plano não inclui sorteios extras de MatchMaking.';
      ELSIF NOT can_draw THEN
        reason := 'Franquia mensal de MatchMaking esgotada.';
      END IF;
    ELSIF is_subscriber THEN
      reason := 'Sua assinatura ativa precisa ter uma franquia de MatchMaking configurada pelo Admin.';
    ELSE
      -- Membros ainda não vinculados a um plano mantêm o comportamento atual até a Fase 4.
      can_draw := true;
    END IF;
  ELSE
    reason := 'Seu papel não possui acesso ao MatchMaking.';
  END IF;

  RETURN jsonb_build_object(
    'year_month', ym,
    'renewal_date', renewal_date,
    'roles', (SELECT COALESCE(jsonb_agg(ur.role), '[]'::jsonb) FROM public.user_roles ur WHERE ur.user_id = _user_id),
    'subscription_id', subscription_id,
    'plan_name', plan_name,
    'quota', quota,
    'used', used,
    'remaining', CASE WHEN quota IS NULL THEN NULL ELSE GREATEST(quota - used, 0) END,
    'metered', metered,
    'can_draw', can_draw,
    'reason', reason,
    'target_ids', COALESCE(target_ids, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_matchmaking_draw_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN public._matchmaking_draw_state(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.draw_matchmaking_suggestion(_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer uuid := auth.uid();
  ym text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
  state jsonb;
  target_active boolean;
  target_allowed boolean;
  already_drawn boolean;
  subscription_id uuid;
BEGIN
  IF viewer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  IF _target_id IS NULL OR _target_id = viewer THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato inválido');
  END IF;

  SELECT p.is_active INTO target_active
  FROM public.profiles p
  WHERE p.id = _target_id;

  IF NOT COALESCE(target_active, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato inexistente ou inativo');
  END IF;

  IF public.is_subscriber(viewer) THEN
    target_allowed := public.is_showcase_profile(_target_id);
    IF NOT target_allowed THEN
      RETURN jsonb_build_object('success', false, 'error', 'Assinantes só podem sortear Assinantes e Convidados ativos');
    END IF;
  ELSE
    target_allowed := EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = viewer AND ur.role IN ('admin', 'facilitador', 'membro')
    ) AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _target_id AND ur.role = 'admin'
    );
    IF NOT target_allowed THEN
      RETURN jsonb_build_object('success', false, 'error', 'Contato fora do universo permitido');
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(viewer::text || ':matchmaking_draw:' || ym, 0));

  SELECT EXISTS (
    SELECT 1 FROM public.usage_quota_events e
    WHERE e.user_id = viewer
      AND e.feature_key = 'matchmaking_draw'
      AND e.year_month = ym
      AND e.reference_id = _target_id
  ) INTO already_drawn;

  IF already_drawn THEN
    state := public._matchmaking_draw_state(viewer);
    RETURN jsonb_build_object('success', true, 'already_drawn', true, 'state', state);
  END IF;

  state := public._matchmaking_draw_state(viewer);
  IF NOT COALESCE((state ->> 'can_draw')::boolean, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(state ->> 'reason', 'Franquia de MatchMaking indisponível'),
      'state', state
    );
  END IF;

  subscription_id := NULLIF(state ->> 'subscription_id', '')::uuid;

  INSERT INTO public.usage_quota_events (
    user_id,
    feature_key,
    year_month,
    subscription_id,
    reference_id,
    metadata
  ) VALUES (
    viewer,
    'matchmaking_draw',
    ym,
    subscription_id,
    _target_id,
    jsonb_build_object('source', 'matchmaking_draw')
  );

  state := public._matchmaking_draw_state(viewer);
  RETURN jsonb_build_object('success', true, 'already_drawn', false, 'state', state);
END;
$$;

CREATE OR REPLACE FUNCTION public.register_matchmaking_attempt(_target_id uuid, _attempt_type text DEFAULT 'manual'::text, _notes text DEFAULT NULL::text, _reference_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_allowed boolean;
  target_allowed boolean;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  caller_allowed := public.is_subscriber(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'facilitador', 'membro')
  );

  IF NOT caller_allowed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seu papel não possui acesso ao MatchMaking');
  END IF;

  IF _target_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato inválido');
  END IF;

  IF public.is_subscriber(auth.uid()) THEN
    target_allowed := public.is_showcase_profile(_target_id);
  ELSE
    target_allowed := EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _target_id AND p.is_active)
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _target_id AND ur.role = 'admin');
  END IF;

  IF NOT target_allowed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contato fora do universo permitido');
  END IF;

  INSERT INTO public.matchmaking_attempts (member_id, target_id, attempt_type, notes, reference_id)
  VALUES (
    auth.uid(),
    _target_id,
    CASE WHEN _attempt_type IN ('manual', 'schedule_request') THEN _attempt_type ELSE 'manual' END,
    _notes,
    _reference_id
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('success', true, 'id', new_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public._matchmaking_draw_state(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._matchmaking_draw_state(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_community_showcase(), public.get_matchmaking_profiles(), public.get_matchmaking_draw_state(), public.draw_matchmaking_suggestion(uuid), public.register_matchmaking_attempt(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_showcase(), public.get_matchmaking_profiles(), public.get_matchmaking_draw_state(), public.draw_matchmaking_suggestion(uuid), public.register_matchmaking_attempt(uuid, text, text, uuid) TO authenticated, service_role;