-- v3.43.0 — Desativação com perda real de acesso + Régua de Resgate

-- 1) Helper: perfil ativo
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_active FROM public.profiles p WHERE p.id = _user_id), false);
$$;

-- 2) Opt-out / pausa de régua
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rescue_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rescue_paused_until timestamptz;

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS rescue_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rescue_paused_until timestamptz;

-- 3) Campanhas de resgate
CREATE TABLE IF NOT EXISTS public.rescue_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL CHECK (audience IN ('ex_membro','convidado','risco')),
  step integer NOT NULL,
  name text NOT NULL,
  delay_days integer NOT NULL,
  subject text NOT NULL,
  intro text,
  body_html text NOT NULL,
  offer_html text,
  cta_label text NOT NULL DEFAULT 'Falar no WhatsApp',
  whatsapp_message text NOT NULL DEFAULT 'Olá! Quero saber mais sobre o Gente Networking.',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audience, step)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rescue_campaigns TO authenticated;
GRANT ALL ON public.rescue_campaigns TO service_role;
ALTER TABLE public.rescue_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam campanhas de resgate"
  ON public.rescue_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER rescue_campaigns_updated_at
  BEFORE UPDATE ON public.rescue_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Fila / histórico de disparos
CREATE TABLE IF NOT EXISTS public.rescue_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL,
  campaign_id uuid REFERENCES public.rescue_campaigns(id) ON DELETE SET NULL,
  step integer NOT NULL DEFAULT 1,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','skipped','cancelled','error')),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  cancel_reason text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rescue_dispatches_profile_campaign_idx
  ON public.rescue_dispatches (profile_id, campaign_id)
  WHERE profile_id IS NOT NULL AND campaign_id IS NOT NULL AND status <> 'cancelled';
CREATE UNIQUE INDEX IF NOT EXISTS rescue_dispatches_lead_campaign_idx
  ON public.rescue_dispatches (lead_id, campaign_id)
  WHERE lead_id IS NOT NULL AND campaign_id IS NOT NULL AND status <> 'cancelled';
CREATE INDEX IF NOT EXISTS rescue_dispatches_status_idx ON public.rescue_dispatches (status, scheduled_for);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rescue_dispatches TO authenticated;
GRANT ALL ON public.rescue_dispatches TO service_role;
ALTER TABLE public.rescue_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam disparos de resgate"
  ON public.rescue_dispatches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Desativação = rebaixamento + bloqueio
CREATE OR REPLACE FUNCTION public.deactivate_member(_member_id uuid, _reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  previous_role app_role;
  previous_team_id uuid;
  teams_removed integer := 0;
  member_name text;
  member_email text;
  lead_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem desativar membros');
  END IF;

  SELECT role INTO previous_role FROM user_roles WHERE user_id = _member_id LIMIT 1;
  IF previous_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível desativar um administrador');
  END IF;

  SELECT full_name, email INTO member_name, member_email FROM profiles WHERE id = _member_id;

  SELECT team_id INTO previous_team_id
  FROM team_members WHERE user_id = _member_id ORDER BY joined_at ASC LIMIT 1;

  DELETE FROM team_members WHERE user_id = _member_id;
  GET DIAGNOSTICS teams_removed = ROW_COUNT;

  -- rebaixa para convidado (perde todos os acessos de membro)
  DELETE FROM user_roles WHERE user_id = _member_id;
  INSERT INTO user_roles (user_id, role) VALUES (_member_id, 'convidado');

  UPDATE profiles
  SET is_active = false,
      deactivated_at = now(),
      deactivation_reason = _reason,
      public_profile_enabled = false
  WHERE id = _member_id;

  -- zera pontuação do mês corrente (não há mais grupo)
  UPDATE monthly_points
  SET points = 0, updated_at = now()
  WHERE user_id = _member_id AND year_month = get_current_year_month();

  -- registra/atualiza lead de resgate no CRM
  SELECT id INTO lead_id FROM crm_leads WHERE profile_id = _member_id LIMIT 1;
  IF lead_id IS NULL AND member_email IS NOT NULL THEN
    SELECT id INTO lead_id FROM crm_leads WHERE lower(email) = lower(member_email) LIMIT 1;
  END IF;

  IF lead_id IS NULL THEN
    INSERT INTO crm_leads (name, email, source, source_detail, status, profile_id, target_team_id, notes, metadata)
    VALUES (
      COALESCE(member_name, 'Ex-membro'),
      COALESCE(member_email, _member_id::text || '@sem-email.local'),
      'convite_manual', 'ex_membro', 'perdido', _member_id, previous_team_id,
      _reason,
      jsonb_build_object('ex_membro', true, 'deactivated_at', now(), 'previous_role', previous_role::text)
    )
    RETURNING id INTO lead_id;
  ELSE
    UPDATE crm_leads
    SET profile_id = _member_id,
        status = 'perdido',
        source_detail = 'ex_membro',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'ex_membro', true, 'deactivated_at', now(), 'previous_role', previous_role::text),
        updated_at = now()
    WHERE id = lead_id;
  END IF;

  INSERT INTO crm_lead_history (lead_id, from_status, to_status, moved_by, reason, event_type, metadata)
  VALUES (lead_id, NULL, 'perdido', auth.uid(), _reason, 'member_deactivated',
          jsonb_build_object('previous_role', previous_role::text, 'previous_team_id', previous_team_id));

  PERFORM add_activity_feed(
    _member_id, 'member_deactivated', _member_id,
    'Membro desativado',
    COALESCE(_reason, 'Acesso rebaixado para convidado'),
    jsonb_build_object('previous_role', previous_role::text, 'previous_team_id', previous_team_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'member_id', _member_id,
    'teams_removed', teams_removed,
    'previous_role', previous_role,
    'lead_id', lead_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 6) Reativação com grupo e role de retorno
CREATE OR REPLACE FUNCTION public.reactivate_member(
  _member_id uuid,
  _team_id uuid DEFAULT NULL,
  _role app_role DEFAULT 'membro'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  lead_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem reativar membros');
  END IF;

  IF _role NOT IN ('membro','facilitador','convidado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role de retorno inválida');
  END IF;

  IF _role IN ('membro','facilitador') AND _team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selecione o grupo de retorno do membro');
  END IF;

  UPDATE profiles
  SET is_active = true, deactivated_at = NULL, deactivation_reason = NULL
  WHERE id = _member_id;

  DELETE FROM user_roles WHERE user_id = _member_id;
  INSERT INTO user_roles (user_id, role) VALUES (_member_id, _role);

  IF _team_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, user_id, is_facilitator)
    VALUES (_team_id, _member_id, _role = 'facilitador')
    ON CONFLICT DO NOTHING;
  END IF;

  -- encerra régua de resgate pendente
  UPDATE rescue_dispatches
  SET status = 'cancelled', cancel_reason = 'convertido'
  WHERE profile_id = _member_id AND status = 'queued';

  SELECT id INTO lead_id FROM crm_leads WHERE profile_id = _member_id LIMIT 1;
  IF lead_id IS NOT NULL THEN
    UPDATE crm_leads SET status = 'fechado', updated_at = now() WHERE id = lead_id;
    INSERT INTO crm_lead_history (lead_id, from_status, to_status, moved_by, reason, event_type, metadata)
    VALUES (lead_id, 'perdido', 'fechado', auth.uid(), 'Membro reativado', 'member_reactivated',
            jsonb_build_object('team_id', _team_id, 'role', _role::text));
  END IF;

  RETURN jsonb_build_object('success', true, 'member_id', _member_id, 'team_id', _team_id, 'role', _role);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
