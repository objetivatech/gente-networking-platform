-- Helpers
CREATE OR REPLACE FUNCTION public.is_subscriber(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'assinante')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','facilitador','membro'))
$$;

CREATE OR REPLACE FUNCTION public.is_showcase_profile(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _profile_id AND p.is_active)
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _profile_id AND role IN ('assinante','convidado'))
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _profile_id AND role IN ('admin','facilitador','membro'))
$$;

CREATE OR REPLACE FUNCTION public.subscriber_can_see(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT public.is_subscriber(_viewer) OR _target = _viewer OR public.is_showcase_profile(_target)
$$;

REVOKE EXECUTE ON FUNCTION public.is_subscriber(uuid), public.is_showcase_profile(uuid), public.subscriber_can_see(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_subscriber(uuid), public.is_showcase_profile(uuid), public.subscriber_can_see(uuid, uuid) TO authenticated, service_role;

-- Plan features
ALTER TABLE public.billing_plans ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.billing_validate_plan_features()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE k text; v jsonb;
BEGIN
  IF jsonb_typeof(NEW.features) <> 'object' THEN RAISE EXCEPTION 'features deve ser um objeto'; END IF;
  FOR k, v IN SELECT * FROM jsonb_each(NEW.features) LOOP
    IF k = 'matchmaking_monthly_quota' THEN
      IF jsonb_typeof(v) <> 'number' OR (v)::text::numeric < 0 OR (v)::text::numeric <> trunc((v)::text::numeric) THEN
        RAISE EXCEPTION 'matchmaking_monthly_quota deve ser inteiro >= 0';
      END IF;
    ELSIF k IN ('can_access_opportunities','can_create_gente_em_acao','public_profile_enabled','ai_pitch_enabled') THEN
      IF jsonb_typeof(v) <> 'boolean' THEN RAISE EXCEPTION '% deve ser verdadeiro/falso', k; END IF;
    ELSE
      RAISE EXCEPTION 'Recurso desconhecido no plano: %', k;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS billing_plans_validate_features ON public.billing_plans;
CREATE TRIGGER billing_plans_validate_features BEFORE INSERT OR UPDATE OF features ON public.billing_plans
FOR EACH ROW EXECUTE FUNCTION public.billing_validate_plan_features();

-- Usage ledger
CREATE TABLE IF NOT EXISTS public.usage_quota_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  year_month text NOT NULL,
  subscription_id uuid REFERENCES public.billing_subscriptions(id) ON DELETE SET NULL,
  reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_quota_events_lookup ON public.usage_quota_events (user_id, feature_key, year_month);
GRANT SELECT ON public.usage_quota_events TO authenticated;
GRANT ALL ON public.usage_quota_events TO service_role;
ALTER TABLE public.usage_quota_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve o proprio consumo" ON public.usage_quota_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_feature_usage(_user_id uuid, _feature_key text, _year_month text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  RETURN (SELECT count(*)::int FROM public.usage_quota_events
          WHERE user_id = _user_id AND feature_key = _feature_key
            AND year_month = coalesce(_year_month, to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')));
END $$;

CREATE OR REPLACE FUNCTION public.get_user_entitlements(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT jsonb_build_object('subscription_id', s.id, 'status', s.status, 'plan_id', p.id,
                            'plan_name', p.name, 'audience', p.audience, 'features', p.features)
    INTO r
  FROM public.billing_subscriptions s JOIN public.billing_plans p ON p.id = s.plan_id
  WHERE s.profile_id = _user_id AND s.status IN ('active','trialing') AND p.active
  ORDER BY s.start_date DESC, s.created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'roles', (SELECT coalesce(jsonb_agg(role), '[]'::jsonb) FROM public.user_roles WHERE user_id = _user_id),
    'subscription', r);
END $$;

REVOKE EXECUTE ON FUNCTION public.get_feature_usage(uuid, text, text), public.get_user_entitlements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feature_usage(uuid, text, text), public.get_user_entitlements(uuid) TO authenticated, service_role;

-- Subscriber isolation: people-scoped tables
DROP POLICY IF EXISTS "Perfis são visíveis para usuários autenticados" ON public.profiles;
CREATE POLICY "Perfis são visíveis para usuários autenticados" ON public.profiles FOR SELECT TO authenticated
  USING (public.subscriber_can_see(auth.uid(), id));

DROP POLICY IF EXISTS "Feed visível para autenticados" ON public.activity_feed;
CREATE POLICY "Feed visível para autenticados" ON public.activity_feed FOR SELECT TO authenticated
  USING (public.subscriber_can_see(auth.uid(), user_id));

DROP POLICY IF EXISTS "Gente em Ação visível para autenticados" ON public.gente_em_acao;
CREATE POLICY "Gente em Ação visível para autenticados" ON public.gente_em_acao FOR SELECT TO authenticated
  USING (public.subscriber_can_see(auth.uid(), user_id) AND (partner_id IS NULL OR public.subscriber_can_see(auth.uid(), partner_id)));

DROP POLICY IF EXISTS "Negócios visíveis para autenticados" ON public.business_deals;
CREATE POLICY "Negócios visíveis para autenticados" ON public.business_deals FOR SELECT TO authenticated
  USING (public.subscriber_can_see(auth.uid(), closed_by_user_id) AND (referred_by_user_id IS NULL OR public.subscriber_can_see(auth.uid(), referred_by_user_id)));

DROP POLICY IF EXISTS "Depoimentos visíveis para autenticados" ON public.testimonials;
CREATE POLICY "Depoimentos visíveis para autenticados" ON public.testimonials FOR SELECT TO authenticated
  USING (public.subscriber_can_see(auth.uid(), from_user_id) AND public.subscriber_can_see(auth.uid(), to_user_id));

DROP POLICY IF EXISTS "Cases visíveis para autenticados" ON public.business_cases;
CREATE POLICY "Cases visíveis para autenticados" ON public.business_cases FOR SELECT TO authenticated
  USING (public.subscriber_can_see(auth.uid(), user_id));

-- Subscriber isolation: member-only modules
DROP POLICY IF EXISTS "Posts visíveis para autenticados" ON public.council_posts;
CREATE POLICY "Posts visíveis para autenticados" ON public.council_posts FOR SELECT TO authenticated
  USING (NOT public.is_subscriber(auth.uid()));
DROP POLICY IF EXISTS "Respostas visíveis para autenticados" ON public.council_replies;
CREATE POLICY "Respostas visíveis para autenticados" ON public.council_replies FOR SELECT TO authenticated
  USING (NOT public.is_subscriber(auth.uid()));
DROP POLICY IF EXISTS "Pontos mensais visíveis para autenticados" ON public.monthly_points;
CREATE POLICY "Pontos mensais visíveis para autenticados" ON public.monthly_points FOR SELECT TO authenticated
  USING (NOT public.is_subscriber(auth.uid()));
DROP POLICY IF EXISTS "Encontros visíveis para autenticados" ON public.meetings;
CREATE POLICY "Encontros visíveis para autenticados" ON public.meetings FOR SELECT TO authenticated
  USING (NOT public.is_subscriber(auth.uid()));
DROP POLICY IF EXISTS "Presenças visíveis para autenticados" ON public.attendances;
CREATE POLICY "Presenças visíveis para autenticados" ON public.attendances FOR SELECT TO authenticated
  USING (NOT public.is_subscriber(auth.uid()));
DROP POLICY IF EXISTS "Membros de equipe visíveis para autenticados" ON public.team_members;
CREATE POLICY "Membros de equipe visíveis para autenticados" ON public.team_members FOR SELECT TO authenticated
  USING (NOT public.is_subscriber(auth.uid()));
DROP POLICY IF EXISTS "Equipes visíveis para autenticados" ON public.teams;
CREATE POLICY "Equipes visíveis para autenticados" ON public.teams FOR SELECT TO authenticated
  USING (NOT public.is_subscriber(auth.uid()));