-- ============================================================================
-- SISTEMA DE GAMIFICAÇÃO MENSAL POR GRUPO v2.3.0
-- ============================================================================

-- 1. Criar tabela monthly_points
CREATE TABLE public.monthly_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  rank public.member_rank NOT NULL DEFAULT 'iniciante',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, team_id, year_month)
);

-- 2. Adicionar colunas à points_history
ALTER TABLE public.points_history 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS year_month TEXT;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_monthly_points_user_team_month 
ON public.monthly_points(user_id, team_id, year_month);

CREATE INDEX IF NOT EXISTS idx_monthly_points_team_month 
ON public.monthly_points(team_id, year_month);

CREATE INDEX IF NOT EXISTS idx_monthly_points_year_month 
ON public.monthly_points(year_month);

CREATE INDEX IF NOT EXISTS idx_points_history_team_month 
ON public.points_history(team_id, year_month);

-- 4. RLS para monthly_points
ALTER TABLE public.monthly_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pontos mensais visíveis para autenticados"
ON public.monthly_points FOR SELECT
USING (true);

CREATE POLICY "Sistema pode inserir pontos mensais"
ON public.monthly_points FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar pontos mensais"
ON public.monthly_points FOR UPDATE
USING (true);

-- 5. Função para obter o mês atual no formato YYYY-MM
CREATE OR REPLACE FUNCTION public.get_current_year_month()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT to_char(now(), 'YYYY-MM');
$$;

-- 6. Função para extrair o mês de uma data
CREATE OR REPLACE FUNCTION public.get_year_month_from_date(d DATE)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT to_char(d, 'YYYY-MM');
$$;

-- 7. Função para calcular pontos mensais de um usuário em um grupo específico
CREATE OR REPLACE FUNCTION public.calculate_monthly_points_for_team(
  _user_id UUID, 
  _team_id UUID, 
  _year_month TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_points INTEGER := 0;
  gente_count INTEGER;
  testimonial_count INTEGER;
  deals_value NUMERIC;
  referral_count INTEGER;
  attendance_count INTEGER;
  invitation_count INTEGER;
BEGIN
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
$$;

-- 8. Função para atualizar pontos mensais de um usuário em um grupo
CREATE OR REPLACE FUNCTION public.update_monthly_points_for_team(
  _user_id UUID, 
  _team_id UUID,
  _year_month TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
  new_points INTEGER;
  new_rank member_rank;
BEGIN
  current_month := COALESCE(_year_month, get_current_year_month());
  new_points := calculate_monthly_points_for_team(_user_id, _team_id, current_month);
  new_rank := get_rank_from_points(new_points);
  
  INSERT INTO monthly_points (user_id, team_id, year_month, points, rank, updated_at)
  VALUES (_user_id, _team_id, current_month, new_points, new_rank, now())
  ON CONFLICT (user_id, team_id, year_month) 
  DO UPDATE SET 
    points = EXCLUDED.points,
    rank = EXCLUDED.rank,
    updated_at = now();
END;
$$;

-- 9. Função para atualizar pontos em todos os grupos do usuário
CREATE OR REPLACE FUNCTION public.update_all_monthly_points_for_user(
  _user_id UUID,
  _year_month TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_record RECORD;
BEGIN
  FOR team_record IN 
    SELECT team_id FROM team_members WHERE user_id = _user_id
  LOOP
    PERFORM update_monthly_points_for_team(_user_id, team_record.team_id, _year_month);
  END LOOP;
END;
$$;

-- 10. Função para obter ranking mensal
CREATE OR REPLACE FUNCTION public.get_monthly_ranking(
  _team_id UUID DEFAULT NULL,
  _year_month TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  company TEXT,
  member_position TEXT,
  team_id UUID,
  team_name TEXT,
  points INTEGER,
  rank member_rank,
  position_rank BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY mp.points DESC;
END;
$$;

-- 11. Função para obter pontos do usuário no mês
CREATE OR REPLACE FUNCTION public.get_user_monthly_points(
  _user_id UUID,
  _team_id UUID DEFAULT NULL,
  _year_month TEXT DEFAULT NULL
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  points INTEGER,
  rank member_rank,
  year_month TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := COALESCE(_year_month, get_current_year_month());
  
  RETURN QUERY
  SELECT 
    mp.team_id,
    t.name as team_name,
    mp.points,
    mp.rank,
    mp.year_month
  FROM monthly_points mp
  JOIN teams t ON t.id = mp.team_id
  WHERE mp.user_id = _user_id
    AND mp.year_month = current_month
    AND (_team_id IS NULL OR mp.team_id = _team_id)
  ORDER BY mp.points DESC;
END;
$$;

-- 12. Atualizar triggers para usar o novo sistema

CREATE OR REPLACE FUNCTION public.handle_gente_em_acao_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  partner_name TEXT;
BEGIN
  SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  
  IF NEW.partner_id IS NOT NULL THEN
    SELECT full_name INTO partner_name FROM profiles WHERE id = NEW.partner_id;
    PERFORM add_activity_feed(
      NEW.user_id, 'gente_em_acao',
      user_name || ' registrou uma reunião ' || NEW.meeting_type,
      'Reunião com ' || partner_name,
      NEW.id
    );
  ELSE
    PERFORM add_activity_feed(
      NEW.user_id, 'gente_em_acao',
      user_name || ' registrou uma reunião ' || NEW.meeting_type,
      'Reunião com convidado: ' || COALESCE(NEW.guest_name, 'Não informado'),
      NEW.id
    );
  END IF;
  
  PERFORM update_all_monthly_points_for_user(NEW.user_id, get_year_month_from_date(NEW.meeting_date));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_testimonial_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_name TEXT;
  to_name TEXT;
BEGIN
  SELECT full_name INTO from_name FROM profiles WHERE id = NEW.from_user_id;
  SELECT full_name INTO to_name FROM profiles WHERE id = NEW.to_user_id;
  
  PERFORM add_activity_feed(
    NEW.from_user_id, 'testimonial',
    from_name || ' enviou um depoimento para ' || to_name,
    LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
    NEW.id
  );
  
  PERFORM update_all_monthly_points_for_user(NEW.from_user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_business_deal_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closer_name TEXT;
  referrer_name TEXT;
BEGIN
  SELECT full_name INTO closer_name FROM profiles WHERE id = NEW.closed_by_user_id;
  
  IF NEW.referred_by_user_id IS NOT NULL THEN
    SELECT full_name INTO referrer_name FROM profiles WHERE id = NEW.referred_by_user_id;
    PERFORM add_activity_feed(
      NEW.closed_by_user_id, 'business_deal',
      closer_name || ' fechou um negócio de R$ ' || TO_CHAR(NEW.value, 'FM999G999G999D00'),
      'Indicação de ' || referrer_name,
      NEW.id,
      jsonb_build_object('value', NEW.value)
    );
  ELSE
    PERFORM add_activity_feed(
      NEW.closed_by_user_id, 'business_deal',
      closer_name || ' fechou um negócio de R$ ' || TO_CHAR(NEW.value, 'FM999G999G999D00'),
      NULL,
      NEW.id,
      jsonb_build_object('value', NEW.value)
    );
  END IF;
  
  PERFORM update_all_monthly_points_for_user(NEW.closed_by_user_id, get_year_month_from_date(NEW.deal_date));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_referral_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_name TEXT;
  to_name TEXT;
BEGIN
  SELECT full_name INTO from_name FROM profiles WHERE id = NEW.from_user_id;
  SELECT full_name INTO to_name FROM profiles WHERE id = NEW.to_user_id;
  
  PERFORM add_activity_feed(
    NEW.from_user_id, 'referral',
    from_name || ' indicou um contato para ' || to_name,
    'Contato: ' || NEW.contact_name,
    NEW.id
  );
  
  PERFORM update_all_monthly_points_for_user(NEW.from_user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_attendance_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  meeting_title TEXT;
  mtg_date DATE;
BEGIN
  SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  SELECT title, meeting_date INTO meeting_title, mtg_date FROM meetings WHERE id = NEW.meeting_id;
  
  PERFORM add_activity_feed(
    NEW.user_id, 'attendance',
    user_name || ' confirmou presença',
    'Encontro: ' || meeting_title,
    NEW.id
  );
  
  PERFORM update_all_monthly_points_for_user(NEW.user_id, get_year_month_from_date(mtg_date));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_guest_attendance_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_id UUID;
  guest_name TEXT;
  inviter_name TEXT;
  meeting_title TEXT;
  mtg_date DATE;
BEGIN
  SELECT invited_by INTO inviter_id
  FROM invitations
  WHERE accepted_by = NEW.user_id AND status = 'accepted'
  LIMIT 1;
  
  IF inviter_id IS NOT NULL THEN
    SELECT full_name INTO guest_name FROM profiles WHERE id = NEW.user_id;
    SELECT full_name INTO inviter_name FROM profiles WHERE id = inviter_id;
    SELECT title, meeting_date INTO meeting_title, mtg_date FROM meetings WHERE id = NEW.meeting_id;
    
    PERFORM add_activity_feed(
      inviter_id, 'guest_attendance',
      inviter_name || ' ganhou pontos por convidado',
      guest_name || ' compareceu ao encontro: ' || meeting_title,
      NEW.id
    );
    
    PERFORM update_all_monthly_points_for_user(inviter_id, get_year_month_from_date(mtg_date));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_testimonial_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_all_monthly_points_for_user(OLD.from_user_id);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_referral_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_all_monthly_points_for_user(OLD.from_user_id);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_business_deal_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_all_monthly_points_for_user(OLD.closed_by_user_id, get_year_month_from_date(OLD.deal_date));
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_gente_em_acao_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_all_monthly_points_for_user(OLD.user_id, get_year_month_from_date(OLD.meeting_date));
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_attendance_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_id UUID;
  mtg_date DATE;
BEGIN
  SELECT meeting_date INTO mtg_date FROM meetings WHERE id = OLD.meeting_id;
  
  PERFORM update_all_monthly_points_for_user(OLD.user_id, get_year_month_from_date(mtg_date));
  
  SELECT invited_by INTO inviter_id
  FROM invitations
  WHERE accepted_by = OLD.user_id AND status = 'accepted'
  LIMIT 1;
  
  IF inviter_id IS NOT NULL THEN
    PERFORM update_all_monthly_points_for_user(inviter_id, get_year_month_from_date(mtg_date));
  END IF;
  
  RETURN OLD;
END;
$$;

-- 13. Função para recalcular pontos mensais de todos os usuários
CREATE OR REPLACE FUNCTION public.recalculate_all_monthly_points(_year_month TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  count INTEGER := 0;
  current_month TEXT;
BEGIN
  current_month := COALESCE(_year_month, get_current_year_month());
  
  FOR user_record IN SELECT DISTINCT user_id FROM team_members LOOP
    PERFORM update_all_monthly_points_for_user(user_record.user_id, current_month);
    count := count + 1;
  END LOOP;
  
  RETURN count;
END;
$$;