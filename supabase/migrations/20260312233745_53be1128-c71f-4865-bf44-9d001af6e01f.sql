
-- Council posts table
CREATE TABLE IF NOT EXISTS council_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'resolvido')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Council replies table
CREATE TABLE IF NOT EXISTS council_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES council_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_best_answer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for council_posts
ALTER TABLE council_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts visíveis para autenticados" ON council_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar posts" ON council_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Autores podem editar próprios posts" ON council_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Autores podem deletar próprios posts" ON council_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin pode gerenciar qualquer post" ON council_posts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for council_replies
ALTER TABLE council_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Respostas visíveis para autenticados" ON council_replies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar respostas" ON council_replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Autores podem editar próprias respostas" ON council_replies
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Autores podem deletar próprias respostas" ON council_replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin pode gerenciar qualquer resposta" ON council_replies
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_council_posts_user_id ON council_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_council_posts_status ON council_posts(status);
CREATE INDEX IF NOT EXISTS idx_council_replies_post_id ON council_replies(post_id);

-- Trigger: activity feed on new reply + points
CREATE OR REPLACE FUNCTION public.handle_council_reply_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  replier_name TEXT;
  post_title TEXT;
  post_user_id UUID;
  common_team UUID;
BEGIN
  SELECT full_name INTO replier_name FROM profiles WHERE id = NEW.user_id;
  SELECT title, user_id, team_id INTO post_title, post_user_id, common_team FROM council_posts WHERE id = NEW.post_id;
  
  PERFORM add_activity_feed(
    NEW.user_id, 'council_reply',
    replier_name || ' respondeu no Conselho 24/7',
    'Tópico: ' || post_title,
    NEW.id, '{}'::jsonb, common_team
  );
  
  -- Update points for replier
  PERFORM update_all_monthly_points_for_user(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_council_reply_insert
  AFTER INSERT ON council_replies
  FOR EACH ROW EXECUTE FUNCTION handle_council_reply_insert();

-- Trigger: bonus points when best answer is marked
CREATE OR REPLACE FUNCTION public.handle_best_answer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_best_answer = true AND (OLD.is_best_answer IS NULL OR OLD.is_best_answer = false) THEN
    PERFORM update_all_monthly_points_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_best_answer_update
  AFTER UPDATE ON council_replies
  FOR EACH ROW EXECUTE FUNCTION handle_best_answer_update();

-- Update calculate_monthly_points_for_team to include council replies
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
  
  RETURN total_points;
END;
$$;
