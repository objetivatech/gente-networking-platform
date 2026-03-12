
-- Bloco 2: Excluir admin e facilitador da gamificação
-- Alterar calculate_monthly_points_for_team para retornar 0 se o usuário é admin ou facilitador

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
  user_role app_role;
BEGIN
  -- Verificar se o usuário é admin ou facilitador - não pontua
  SELECT role INTO user_role FROM user_roles WHERE user_id = _user_id LIMIT 1;
  IF user_role IN ('admin', 'facilitador') THEN
    RETURN 0;
  END IF;

  -- Gente em Ação: 25 pontos cada
  SELECT COUNT(*) INTO gente_count 
  FROM gente_em_acao g
  WHERE g.user_id = _user_id
    AND get_year_month_from_date(g.meeting_date) = _year_month
    AND (
      (g.partner_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = _team_id AND tm.user_id = g.partner_id
      ))
      OR
      (g.partner_id IS NULL AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = _team_id AND tm.user_id = _user_id
      ))
    );
  total_points := total_points + (gente_count * 25);
  
  -- Depoimentos dados: 15 pontos cada
  SELECT COUNT(*) INTO testimonial_count 
  FROM testimonials t
  WHERE t.from_user_id = _user_id
    AND get_year_month_from_date(t.created_at::date) = _year_month
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = _team_id AND tm.user_id = t.to_user_id
    );
  total_points := total_points + (testimonial_count * 15);
  
  -- Negócios fechados: 5 pontos por R$100
  SELECT COALESCE(SUM(value), 0) INTO deals_value 
  FROM business_deals bd
  WHERE bd.closed_by_user_id = _user_id
    AND get_year_month_from_date(bd.deal_date) = _year_month
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = _team_id AND tm.user_id = _user_id
    );
  total_points := total_points + (FLOOR(deals_value / 100)::INTEGER * 5);
  
  -- Indicações feitas: 20 pontos cada
  SELECT COUNT(*) INTO referral_count 
  FROM referrals r
  WHERE r.from_user_id = _user_id
    AND get_year_month_from_date(r.created_at::date) = _year_month
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = _team_id AND tm.user_id = r.to_user_id
    );
  total_points := total_points + (referral_count * 20);
  
  -- Presenças: 20 pontos cada
  SELECT COUNT(*) INTO attendance_count 
  FROM attendances a
  JOIN meetings m ON m.id = a.meeting_id
  WHERE a.user_id = _user_id
    AND get_year_month_from_date(m.meeting_date) = _year_month
    AND (m.team_id = _team_id OR m.team_id IS NULL);
  total_points := total_points + (attendance_count * 20);
  
  -- Convites aceitos com presença: 15 pontos cada
  SELECT COUNT(DISTINCT a.user_id) INTO invitation_count
  FROM attendances a
  JOIN invitations i ON i.accepted_by = a.user_id
  JOIN meetings m ON m.id = a.meeting_id
  WHERE i.invited_by = _user_id 
    AND i.status = 'accepted'
    AND get_year_month_from_date(m.meeting_date) = _year_month
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = _team_id AND tm.user_id = _user_id
    );
  total_points := total_points + (invitation_count * 15);
  
  RETURN total_points;
END;
$function$;

-- Alterar get_monthly_ranking para excluir admin e facilitador
CREATE OR REPLACE FUNCTION public.get_monthly_ranking(_team_id uuid DEFAULT NULL::uuid, _year_month text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, company text, member_position text, team_id uuid, team_name text, points integer, rank member_rank, position_rank bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month TEXT;
BEGIN
  current_month := COALESCE(_year_month, get_current_year_month());
  
  RETURN QUERY
  SELECT 
    mp.user_id,
    p.full_name,
    p.avatar_url,
    p.company,
    p.position as member_position,
    mp.team_id,
    t.name as team_name,
    mp.points,
    mp.rank,
    ROW_NUMBER() OVER (ORDER BY mp.points DESC) as position_rank
  FROM monthly_points mp
  JOIN profiles p ON p.id = mp.user_id
  JOIN teams t ON t.id = mp.team_id
  WHERE mp.year_month = current_month
    AND p.is_active = true
    AND (_team_id IS NULL OR mp.team_id = _team_id)
    -- Excluir admin e facilitador do ranking
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = mp.user_id 
      AND ur.role IN ('admin', 'facilitador')
    )
  ORDER BY mp.points DESC;
END;
$function$;

-- Alterar calculate_user_points (legado global) para também excluir admin/facilitador
CREATE OR REPLACE FUNCTION public.calculate_user_points(_user_id uuid)
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
  guest_attendance_count INTEGER;
  user_role app_role;
BEGIN
  -- Verificar se o usuário é admin ou facilitador - não pontua
  SELECT role INTO user_role FROM user_roles WHERE user_id = _user_id LIMIT 1;
  IF user_role IN ('admin', 'facilitador') THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO gente_count FROM gente_em_acao WHERE user_id = _user_id;
  total_points := total_points + (gente_count * 25);
  
  SELECT COUNT(*) INTO testimonial_count FROM testimonials WHERE from_user_id = _user_id;
  total_points := total_points + (testimonial_count * 15);
  
  SELECT COALESCE(SUM(value), 0) INTO deals_value FROM business_deals WHERE closed_by_user_id = _user_id;
  total_points := total_points + (FLOOR(deals_value / 100)::INTEGER * 5);
  
  SELECT COUNT(*) INTO referral_count FROM referrals WHERE from_user_id = _user_id;
  total_points := total_points + (referral_count * 20);
  
  SELECT COUNT(*) INTO attendance_count FROM attendances WHERE user_id = _user_id;
  total_points := total_points + (attendance_count * 20);
  
  SELECT COUNT(DISTINCT a.user_id) INTO guest_attendance_count 
  FROM attendances a
  JOIN invitations i ON i.accepted_by = a.user_id
  WHERE i.invited_by = _user_id AND i.status = 'accepted';
  total_points := total_points + (guest_attendance_count * 15);
  
  RETURN total_points;
END;
$function$;

-- Admin RLS policies para CRUD total em todas as tabelas de atividades

-- gente_em_acao: admin pode editar e deletar qualquer registro
CREATE POLICY "Admin pode editar qualquer gente_em_acao"
ON public.gente_em_acao FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar qualquer gente_em_acao"
ON public.gente_em_acao FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- testimonials: admin pode editar e deletar qualquer registro
CREATE POLICY "Admin pode editar qualquer depoimento"
ON public.testimonials FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar qualquer depoimento"
ON public.testimonials FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- referrals: admin pode editar e deletar qualquer registro
CREATE POLICY "Admin pode editar qualquer indicação"
ON public.referrals FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar qualquer indicação"
ON public.referrals FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- business_deals: admin pode editar e deletar qualquer registro
CREATE POLICY "Admin pode editar qualquer negócio"
ON public.business_deals FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar qualquer negócio"
ON public.business_deals FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- invitations: admin pode deletar qualquer convite
CREATE POLICY "Admin pode deletar qualquer convite"
ON public.invitations FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles: admin pode editar qualquer perfil
CREATE POLICY "Admin pode editar qualquer perfil"
ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
