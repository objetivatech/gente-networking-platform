-- Atualizar a função de cálculo de pontos com as novas regras
CREATE OR REPLACE FUNCTION public.calculate_user_points(_user_id uuid)
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
  guest_attendance_count INTEGER;
BEGIN
  -- Gente em Ação: 25 pontos cada (era 10)
  SELECT COUNT(*) INTO gente_count FROM gente_em_acao WHERE user_id = _user_id;
  total_points := total_points + (gente_count * 25);
  
  -- Depoimentos dados: 15 pontos cada (mantido)
  SELECT COUNT(*) INTO testimonial_count FROM testimonials WHERE from_user_id = _user_id;
  total_points := total_points + (testimonial_count * 15);
  
  -- Negócios fechados: 5 pontos por R$100 (era 1)
  SELECT COALESCE(SUM(value), 0) INTO deals_value FROM business_deals WHERE closed_by_user_id = _user_id;
  total_points := total_points + (FLOOR(deals_value / 100)::INTEGER * 5);
  
  -- Indicações feitas: 20 pontos cada (mantido)
  SELECT COUNT(*) INTO referral_count FROM referrals WHERE from_user_id = _user_id;
  total_points := total_points + (referral_count * 20);
  
  -- Presenças: 20 pontos cada (era 25)
  SELECT COUNT(*) INTO attendance_count FROM attendances WHERE user_id = _user_id;
  total_points := total_points + (attendance_count * 20);
  
  -- Convites aceitos: 15 pontos por convidado que participa de encontro
  -- Conta presenças de convidados que foram convidados por este usuário
  SELECT COUNT(DISTINCT a.user_id) INTO guest_attendance_count 
  FROM attendances a
  JOIN invitations i ON i.accepted_by = a.user_id
  WHERE i.invited_by = _user_id 
    AND i.status = 'accepted';
  total_points := total_points + (guest_attendance_count * 15);
  
  RETURN total_points;
END;
$$;

-- Trigger para atualizar pontos quando um convidado registra presença
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
BEGIN
  -- Verificar se o usuário é um convidado que foi convidado por alguém
  SELECT invited_by INTO inviter_id
  FROM invitations
  WHERE accepted_by = NEW.user_id AND status = 'accepted'
  LIMIT 1;
  
  -- Se encontrou um convidador, atualizar os pontos dele
  IF inviter_id IS NOT NULL THEN
    SELECT full_name INTO guest_name FROM profiles WHERE id = NEW.user_id;
    SELECT full_name INTO inviter_name FROM profiles WHERE id = inviter_id;
    SELECT title INTO meeting_title FROM meetings WHERE id = NEW.meeting_id;
    
    -- Adicionar atividade no feed
    PERFORM add_activity_feed(
      inviter_id, 'guest_attendance',
      inviter_name || ' ganhou pontos por convidado',
      guest_name || ' compareceu ao encontro: ' || meeting_title,
      NEW.id
    );
    
    -- Atualizar pontos do convidador
    PERFORM update_user_points_and_rank(inviter_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger se não existir (drop primeiro para evitar duplicatas)
DROP TRIGGER IF EXISTS on_guest_attendance_insert ON attendances;
CREATE TRIGGER on_guest_attendance_insert
  AFTER INSERT ON attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_guest_attendance_insert();