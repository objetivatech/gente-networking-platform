-- 1. Tabela de conexões de MatchMaking
CREATE TABLE public.matchmaking_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text,
  gente_em_acao_id uuid REFERENCES public.gente_em_acao(id) ON DELETE SET NULL,
  year_month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (member_id, target_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matchmaking_connections TO authenticated;
GRANT ALL ON public.matchmaking_connections TO service_role;

ALTER TABLE public.matchmaking_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem seus proprios checks"
ON public.matchmaking_connections
FOR SELECT
TO authenticated
USING (
  member_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'facilitador')
);

CREATE POLICY "Membros criam seus proprios checks"
ON public.matchmaking_connections
FOR INSERT
TO authenticated
WITH CHECK (member_id = auth.uid());

CREATE POLICY "Membros removem seus proprios checks"
ON public.matchmaking_connections
FOR DELETE
TO authenticated
USING (member_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE INDEX idx_matchmaking_member_month ON public.matchmaking_connections (member_id, year_month);

-- 2. RPC para criar um check de MatchMaking (cria Gente em Acao + registra conexao)
CREATE OR REPLACE FUNCTION public.create_matchmaking_check(
  _target_id uuid,
  _description text DEFAULT NULL,
  _meeting_date date DEFAULT CURRENT_DATE
)
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
    INSERT INTO gente_em_acao (user_id, meeting_type, guest_name, guest_company, notes, meeting_date)
    VALUES (auth.uid(), 'convidado', target_name, target_company,
            COALESCE(_description, 'Conexão via MatchMaking'), _meeting_date)
    RETURNING id INTO new_gea_id;
  ELSE
    INSERT INTO gente_em_acao (user_id, meeting_type, partner_id, notes, meeting_date)
    VALUES (auth.uid(), 'membro', _target_id,
            COALESCE(_description, 'Conexão via MatchMaking'), _meeting_date)
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

-- 3. Atualizar cálculo mensal: somar +10 por conexão de MatchMaking
CREATE OR REPLACE FUNCTION public.calculate_monthly_points_for_team(_user_id uuid, _team_id uuid, _year_month text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_points INTEGER := 0;
  gente_count INTEGER;
  testimonial_count INTEGER;
  deals_value NUMERIC;
  referral_count INTEGER;
  attendance_count INTEGER;
  invitation_count INTEGER;
  council_reply_count INTEGER;
  best_answer_count INTEGER;
  business_case_count INTEGER;
  business_case_referral_count INTEGER;
  matchmaking_count INTEGER;
  user_role app_role;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = _user_id LIMIT 1;
  IF user_role IN ('admin', 'facilitador') THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO gente_count 
  FROM gente_em_acao g
  WHERE g.user_id = _user_id
    AND get_year_month_from_date(g.meeting_date) = _year_month
    AND (
      (g.partner_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = g.partner_id
      ))
      OR
      (g.partner_id IS NULL AND EXISTS (
        SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id
      ))
    );
  total_points := total_points + (gente_count * 25);
  
  SELECT COUNT(*) INTO testimonial_count 
  FROM testimonials t
  WHERE t.from_user_id = _user_id
    AND get_year_month_from_date(t.created_at::date) = _year_month
    AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = t.to_user_id);
  total_points := total_points + (testimonial_count * 15);
  
  SELECT COALESCE(SUM(value), 0) INTO deals_value 
  FROM business_deals bd
  WHERE bd.closed_by_user_id = _user_id
    AND get_year_month_from_date(bd.deal_date) = _year_month
    AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id);
  total_points := total_points + (FLOOR(deals_value / 100)::INTEGER * 5);
  
  SELECT COUNT(*) INTO referral_count 
  FROM referrals r
  WHERE r.from_user_id = _user_id
    AND get_year_month_from_date(r.created_at::date) = _year_month
    AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = r.to_user_id);
  total_points := total_points + (referral_count * 20);
  
  SELECT COUNT(*) INTO attendance_count 
  FROM attendances a
  JOIN meetings m ON m.id = a.meeting_id
  WHERE a.user_id = _user_id
    AND get_year_month_from_date(m.meeting_date) = _year_month
    AND (m.team_id = _team_id OR m.team_id IS NULL);
  total_points := total_points + (attendance_count * 20);
  
  SELECT COUNT(DISTINCT a.user_id) INTO invitation_count
  FROM attendances a
  JOIN invitations i ON i.accepted_by = a.user_id
  JOIN meetings m ON m.id = a.meeting_id
  WHERE i.invited_by = _user_id 
    AND i.status = 'accepted'
    AND get_year_month_from_date(m.meeting_date) = _year_month
    AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id)
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = a.user_id AND ur.role = 'convidado')
    AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = a.user_id AND ur.role IN ('membro', 'admin', 'facilitador'));
  total_points := total_points + (invitation_count * 15);
  
  SELECT COUNT(*) INTO council_reply_count
  FROM council_replies cr
  JOIN council_posts cp ON cp.id = cr.post_id
  WHERE cr.user_id = _user_id
    AND get_year_month_from_date(cr.created_at::date) = _year_month
    AND (cp.team_id = _team_id OR cp.team_id IS NULL);
  total_points := total_points + (council_reply_count * 5);
  
  SELECT COUNT(*) INTO best_answer_count
  FROM council_replies cr
  JOIN council_posts cp ON cp.id = cr.post_id
  WHERE cr.user_id = _user_id
    AND cr.is_best_answer = true
    AND get_year_month_from_date(cr.created_at::date) = _year_month
    AND (cp.team_id = _team_id OR cp.team_id IS NULL);
  total_points := total_points + (best_answer_count * 5);
  
  SELECT COUNT(*) INTO business_case_count
  FROM business_cases bc
  WHERE bc.user_id = _user_id
    AND get_year_month_from_date(bc.created_at::date) = _year_month
    AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id);
  total_points := total_points + (business_case_count * 15);
  
  SELECT COUNT(*) INTO business_case_referral_count
  FROM business_cases bc
  JOIN business_deals bd ON bd.id = bc.business_deal_id
  WHERE bd.referred_by_user_id = _user_id
    AND get_year_month_from_date(bc.created_at::date) = _year_month
    AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id);
  total_points := total_points + (business_case_referral_count * 20);

  -- MatchMaking: +10 por conexão realizada no mês (somente para membros do grupo)
  SELECT COUNT(*) INTO matchmaking_count
  FROM matchmaking_connections mc
  WHERE mc.member_id = _user_id
    AND mc.year_month = _year_month
    AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id);
  total_points := total_points + (matchmaking_count * 10);
  
  RETURN total_points;
END;
$function$;