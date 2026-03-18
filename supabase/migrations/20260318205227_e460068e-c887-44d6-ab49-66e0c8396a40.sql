-- =============================================
-- A. Remover triggers duplicados na tabela attendances
-- =============================================
DROP TRIGGER IF EXISTS trigger_attendance_insert ON attendances;
DROP TRIGGER IF EXISTS trigger_attendance_delete ON attendances;
DROP TRIGGER IF EXISTS trigger_guest_attendance_insert ON attendances;

-- =============================================
-- B. Corrigir handle_guest_attendance_insert: verificar role atual
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_guest_attendance_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inviter_id UUID;
  guest_name TEXT;
  inviter_name TEXT;
  meeting_title TEXT;
  mtg_date DATE;
  mtg_team_id UUID;
BEGIN
  -- Só processa se o usuário AINDA tem role 'convidado' e NÃO tem roles internas
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role = 'convidado') THEN
    RETURN NEW;
  END IF;
  
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role IN ('membro', 'admin', 'facilitador')) THEN
    RETURN NEW;
  END IF;

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
$function$;

-- =============================================
-- C. Corrigir calculate_monthly_points_for_team: verificar role na seção de convites
-- =============================================
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
  
  -- Convites aceitos com presença: 15 pts - CORRIGIDO: verifica role atual
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
  
  RETURN total_points;
END;
$function$;

-- =============================================
-- D. Limpar dados duplicados existentes no activity_feed
-- =============================================

-- Remover duplicatas: manter o mais antigo de cada grupo
DELETE FROM activity_feed
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, activity_type, reference_id, date_trunc('minute', created_at)
        ORDER BY created_at ASC
      ) as rn
    FROM activity_feed
    WHERE reference_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Remover entradas de guest_attendance indevidas (usuário referenciado já é membro)
DELETE FROM activity_feed
WHERE activity_type = 'guest_attendance'
  AND id IN (
    SELECT af.id 
    FROM activity_feed af
    WHERE af.activity_type = 'guest_attendance'
      AND EXISTS (
        SELECT 1 FROM attendances att
        WHERE att.id = af.reference_id
          AND EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = att.user_id 
              AND ur.role IN ('membro', 'admin', 'facilitador')
          )
      )
  );