-- Tabela de conteúdos educativos
CREATE TABLE public.contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'documento', 'artigo', 'link')),
  url TEXT,
  thumbnail_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conteúdos visíveis para autenticados" ON public.contents
  FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar conteúdos" ON public.contents
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_contents_updated_at
  BEFORE UPDATE ON public.contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular pontos e atualizar rank
CREATE OR REPLACE FUNCTION public.calculate_user_points(_user_id UUID)
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
BEGIN
  -- Gente em Ação: 10 pontos cada
  SELECT COUNT(*) INTO gente_count FROM gente_em_acao WHERE user_id = _user_id;
  total_points := total_points + (gente_count * 10);
  
  -- Depoimentos dados: 15 pontos cada
  SELECT COUNT(*) INTO testimonial_count FROM testimonials WHERE from_user_id = _user_id;
  total_points := total_points + (testimonial_count * 15);
  
  -- Negócios fechados: 1 ponto por R$100
  SELECT COALESCE(SUM(value), 0) INTO deals_value FROM business_deals WHERE closed_by_user_id = _user_id;
  total_points := total_points + FLOOR(deals_value / 100)::INTEGER;
  
  -- Indicações feitas: 20 pontos cada
  SELECT COUNT(*) INTO referral_count FROM referrals WHERE from_user_id = _user_id;
  total_points := total_points + (referral_count * 20);
  
  -- Presenças: 25 pontos cada
  SELECT COUNT(*) INTO attendance_count FROM attendances WHERE user_id = _user_id;
  total_points := total_points + (attendance_count * 25);
  
  RETURN total_points;
END;
$$;

-- Função para determinar rank baseado em pontos
CREATE OR REPLACE FUNCTION public.get_rank_from_points(_points INTEGER)
RETURNS member_rank
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _points >= 1000 THEN
    RETURN 'diamante';
  ELSIF _points >= 500 THEN
    RETURN 'ouro';
  ELSIF _points >= 200 THEN
    RETURN 'prata';
  ELSIF _points >= 50 THEN
    RETURN 'bronze';
  ELSE
    RETURN 'iniciante';
  END IF;
END;
$$;

-- Função para atualizar pontos e rank do usuário
CREATE OR REPLACE FUNCTION public.update_user_points_and_rank(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points INTEGER;
  new_rank member_rank;
BEGIN
  new_points := calculate_user_points(_user_id);
  new_rank := get_rank_from_points(new_points);
  
  UPDATE profiles
  SET points = new_points, rank = new_rank, updated_at = now()
  WHERE id = _user_id;
END;
$$;

-- Função para adicionar ao feed de atividades
CREATE OR REPLACE FUNCTION public.add_activity_feed(
  _user_id UUID,
  _activity_type TEXT,
  _title TEXT,
  _description TEXT DEFAULT NULL,
  _reference_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO activity_feed (user_id, activity_type, title, description, reference_id, metadata)
  VALUES (_user_id, _activity_type, _title, _description, _reference_id, _metadata)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Trigger para Gente em Ação
CREATE OR REPLACE FUNCTION public.handle_gente_em_acao_insert()
RETURNS TRIGGER
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
  
  PERFORM update_user_points_and_rank(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_gente_em_acao_insert
  AFTER INSERT ON gente_em_acao
  FOR EACH ROW EXECUTE FUNCTION handle_gente_em_acao_insert();

-- Trigger para Depoimentos
CREATE OR REPLACE FUNCTION public.handle_testimonial_insert()
RETURNS TRIGGER
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
  
  PERFORM update_user_points_and_rank(NEW.from_user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_testimonial_insert
  AFTER INSERT ON testimonials
  FOR EACH ROW EXECUTE FUNCTION handle_testimonial_insert();

-- Trigger para Negócios
CREATE OR REPLACE FUNCTION public.handle_business_deal_insert()
RETURNS TRIGGER
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
  
  PERFORM update_user_points_and_rank(NEW.closed_by_user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_deal_insert
  AFTER INSERT ON business_deals
  FOR EACH ROW EXECUTE FUNCTION handle_business_deal_insert();

-- Trigger para Indicações
CREATE OR REPLACE FUNCTION public.handle_referral_insert()
RETURNS TRIGGER
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
  
  PERFORM update_user_points_and_rank(NEW.from_user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_referral_insert
  AFTER INSERT ON referrals
  FOR EACH ROW EXECUTE FUNCTION handle_referral_insert();

-- Trigger para Presenças
CREATE OR REPLACE FUNCTION public.handle_attendance_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  meeting_title TEXT;
BEGIN
  SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  SELECT title INTO meeting_title FROM meetings WHERE id = NEW.meeting_id;
  
  PERFORM add_activity_feed(
    NEW.user_id, 'attendance',
    user_name || ' confirmou presença',
    'Encontro: ' || meeting_title,
    NEW.id
  );
  
  PERFORM update_user_points_and_rank(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_attendance_insert
  AFTER INSERT ON attendances
  FOR EACH ROW EXECUTE FUNCTION handle_attendance_insert();

-- Habilitar realtime para activity_feed
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
ALTER TABLE activity_feed REPLICA IDENTITY FULL;