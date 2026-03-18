
-- Fix handle_gente_em_acao_insert: "convidado" -> "pessoa externa" in activity feed
CREATE OR REPLACE FUNCTION public.handle_gente_em_acao_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
  partner_name TEXT;
  common_team UUID;
BEGIN
  SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  
  IF NEW.partner_id IS NOT NULL THEN
    SELECT tm1.team_id INTO common_team 
    FROM team_members tm1 
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = NEW.user_id AND tm2.user_id = NEW.partner_id
    LIMIT 1;
    
    SELECT full_name INTO partner_name FROM profiles WHERE id = NEW.partner_id;
    PERFORM add_activity_feed(
      NEW.user_id, 'gente_em_acao',
      user_name || ' registrou uma reunião com membro',
      'Reunião com ' || partner_name,
      NEW.id, '{}'::jsonb, common_team
    );
  ELSE
    SELECT team_id INTO common_team FROM team_members WHERE user_id = NEW.user_id LIMIT 1;
    
    PERFORM add_activity_feed(
      NEW.user_id, 'gente_em_acao',
      user_name || ' registrou uma reunião com pessoa externa',
      'Reunião com ' || COALESCE(NEW.guest_name, 'Não informado'),
      NEW.id, '{}'::jsonb, common_team
    );
  END IF;
  
  PERFORM update_all_monthly_points_for_user(NEW.user_id, get_year_month_from_date(NEW.meeting_date));
  RETURN NEW;
END;
$$;

-- Fix handle_guest_attendance_insert: improve description
CREATE OR REPLACE FUNCTION public.handle_guest_attendance_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inviter_id UUID;
  guest_name TEXT;
  inviter_name TEXT;
  meeting_title TEXT;
  mtg_date DATE;
  mtg_team_id UUID;
BEGIN
  SELECT invited_by INTO inviter_id
  FROM invitations
  WHERE accepted_by = NEW.user_id AND status = 'accepted'
  LIMIT 1;
  
  IF inviter_id IS NOT NULL THEN
    SELECT full_name INTO guest_name FROM profiles WHERE id = NEW.user_id;
    SELECT full_name INTO inviter_name FROM profiles WHERE id = inviter_id;
    SELECT title, meeting_date, team_id INTO meeting_title, mtg_date, mtg_team_id FROM meetings WHERE id = NEW.meeting_id;
    
    PERFORM add_activity_feed(
      inviter_id, 'guest_attendance',
      inviter_name || ' ganhou pontos — convidado presente no encontro',
      guest_name || ' compareceu ao encontro: ' || meeting_title,
      NEW.id, '{}'::jsonb, mtg_team_id
    );
    
    PERFORM update_all_monthly_points_for_user(inviter_id, get_year_month_from_date(mtg_date));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix calculate_monthly_points_for_team: add referrer points for business cases (20 pts)
CREATE OR REPLACE FUNCTION public.calculate_monthly_points_for_team(_user_id uuid, _team_id uuid, _year_month text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Respostas no Conselho: 5 pontos cada
  SELECT COUNT(*) INTO council_reply_count
  FROM council_replies cr
  JOIN council_posts cp ON cp.id = cr.post_id
  WHERE cr.user_id = _user_id
    AND get_year_month_from_date(cr.created_at::date) = _year_month
    AND (cp.team_id = _team_id OR cp.team_id IS NULL);
  total_points := total_points + (council_reply_count * 5);
  
  -- Melhor resposta no Conselho: +5 pontos cada
  SELECT COUNT(*) INTO best_answer_count
  FROM council_replies cr
  JOIN council_posts cp ON cp.id = cr.post_id
  WHERE cr.user_id = _user_id
    AND cr.is_best_answer = true
    AND get_year_month_from_date(cr.created_at::date) = _year_month
    AND (cp.team_id = _team_id OR cp.team_id IS NULL);
  total_points := total_points + (best_answer_count * 5);
  
  -- Cases de Negócio: 15 pontos para o autor
  SELECT COUNT(*) INTO business_case_count
  FROM business_cases bc
  WHERE bc.user_id = _user_id
    AND get_year_month_from_date(bc.created_at::date) = _year_month
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = _team_id AND tm.user_id = _user_id
    );
  total_points := total_points + (business_case_count * 15);
  
  -- Cases de Negócio: 20 pontos para o indicador do deal associado
  SELECT COUNT(*) INTO business_case_referral_count
  FROM business_cases bc
  JOIN business_deals bd ON bd.id = bc.business_deal_id
  WHERE bd.referred_by_user_id = _user_id
    AND get_year_month_from_date(bc.created_at::date) = _year_month
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = _team_id AND tm.user_id = _user_id
    );
  total_points := total_points + (business_case_referral_count * 20);
  
  RETURN total_points;
END;
$$;
