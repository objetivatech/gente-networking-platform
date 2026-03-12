-- Add team_id column to activity_feed for direct group filtering
ALTER TABLE public.activity_feed 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_activity_feed_team_id ON public.activity_feed(team_id);

-- Update add_activity_feed function to accept team_id
CREATE OR REPLACE FUNCTION public.add_activity_feed(
  _user_id uuid, 
  _activity_type text, 
  _title text, 
  _description text DEFAULT NULL, 
  _reference_id uuid DEFAULT NULL, 
  _metadata jsonb DEFAULT '{}'::jsonb,
  _team_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO activity_feed (user_id, activity_type, title, description, reference_id, metadata, team_id)
  VALUES (_user_id, _activity_type, _title, _description, _reference_id, _metadata, _team_id)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Update handle_attendance_insert to pass team_id
CREATE OR REPLACE FUNCTION public.handle_attendance_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
  meeting_title TEXT;
  mtg_date DATE;
  mtg_team_id UUID;
BEGIN
  SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  SELECT title, meeting_date, team_id INTO meeting_title, mtg_date, mtg_team_id FROM meetings WHERE id = NEW.meeting_id;
  
  PERFORM add_activity_feed(
    NEW.user_id, 'attendance',
    user_name || ' confirmou presença',
    'Encontro: ' || meeting_title,
    NEW.id, '{}'::jsonb, mtg_team_id
  );
  
  PERFORM update_all_monthly_points_for_user(NEW.user_id, get_year_month_from_date(mtg_date));
  RETURN NEW;
END;
$$;

-- Update handle_gente_em_acao_insert to pass team_id (uses common team between user and partner)
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
  
  -- Find common team between user and partner
  IF NEW.partner_id IS NOT NULL THEN
    SELECT tm1.team_id INTO common_team 
    FROM team_members tm1 
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = NEW.user_id AND tm2.user_id = NEW.partner_id
    LIMIT 1;
    
    SELECT full_name INTO partner_name FROM profiles WHERE id = NEW.partner_id;
    PERFORM add_activity_feed(
      NEW.user_id, 'gente_em_acao',
      user_name || ' registrou uma reunião ' || NEW.meeting_type,
      'Reunião com ' || partner_name,
      NEW.id, '{}'::jsonb, common_team
    );
  ELSE
    -- For guest meetings, use user's first team
    SELECT team_id INTO common_team FROM team_members WHERE user_id = NEW.user_id LIMIT 1;
    
    PERFORM add_activity_feed(
      NEW.user_id, 'gente_em_acao',
      user_name || ' registrou uma reunião ' || NEW.meeting_type,
      'Reunião com convidado: ' || COALESCE(NEW.guest_name, 'Não informado'),
      NEW.id, '{}'::jsonb, common_team
    );
  END IF;
  
  PERFORM update_all_monthly_points_for_user(NEW.user_id, get_year_month_from_date(NEW.meeting_date));
  RETURN NEW;
END;
$$;

-- Update handle_testimonial_insert to pass team_id
CREATE OR REPLACE FUNCTION public.handle_testimonial_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  from_name TEXT;
  to_name TEXT;
  common_team UUID;
BEGIN
  SELECT full_name INTO from_name FROM profiles WHERE id = NEW.from_user_id;
  SELECT full_name INTO to_name FROM profiles WHERE id = NEW.to_user_id;
  
  SELECT tm1.team_id INTO common_team 
  FROM team_members tm1 
  JOIN team_members tm2 ON tm1.team_id = tm2.team_id
  WHERE tm1.user_id = NEW.from_user_id AND tm2.user_id = NEW.to_user_id
  LIMIT 1;
  
  PERFORM add_activity_feed(
    NEW.from_user_id, 'testimonial',
    from_name || ' enviou um depoimento para ' || to_name,
    LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
    NEW.id, '{}'::jsonb, common_team
  );
  
  PERFORM update_all_monthly_points_for_user(NEW.from_user_id);
  RETURN NEW;
END;
$$;

-- Update handle_referral_insert to pass team_id
CREATE OR REPLACE FUNCTION public.handle_referral_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  from_name TEXT;
  to_name TEXT;
  common_team UUID;
BEGIN
  SELECT full_name INTO from_name FROM profiles WHERE id = NEW.from_user_id;
  SELECT full_name INTO to_name FROM profiles WHERE id = NEW.to_user_id;
  
  SELECT tm1.team_id INTO common_team 
  FROM team_members tm1 
  JOIN team_members tm2 ON tm1.team_id = tm2.team_id
  WHERE tm1.user_id = NEW.from_user_id AND tm2.user_id = NEW.to_user_id
  LIMIT 1;
  
  PERFORM add_activity_feed(
    NEW.from_user_id, 'referral',
    from_name || ' indicou um contato para ' || to_name,
    'Contato: ' || NEW.contact_name,
    NEW.id, '{}'::jsonb, common_team
  );
  
  PERFORM update_all_monthly_points_for_user(NEW.from_user_id);
  RETURN NEW;
END;
$$;

-- Update handle_business_deal_insert to pass team_id
CREATE OR REPLACE FUNCTION public.handle_business_deal_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  closer_name TEXT;
  referrer_name TEXT;
  user_team UUID;
BEGIN
  SELECT full_name INTO closer_name FROM profiles WHERE id = NEW.closed_by_user_id;
  SELECT team_id INTO user_team FROM team_members WHERE user_id = NEW.closed_by_user_id LIMIT 1;
  
  IF NEW.referred_by_user_id IS NOT NULL THEN
    SELECT full_name INTO referrer_name FROM profiles WHERE id = NEW.referred_by_user_id;
    PERFORM add_activity_feed(
      NEW.closed_by_user_id, 'business_deal',
      closer_name || ' fechou um negócio de R$ ' || TO_CHAR(NEW.value, 'FM999G999G999D00'),
      'Indicação de ' || referrer_name,
      NEW.id,
      jsonb_build_object('value', NEW.value),
      user_team
    );
  ELSE
    PERFORM add_activity_feed(
      NEW.closed_by_user_id, 'business_deal',
      closer_name || ' fechou um negócio de R$ ' || TO_CHAR(NEW.value, 'FM999G999G999D00'),
      NULL,
      NEW.id,
      jsonb_build_object('value', NEW.value),
      user_team
    );
  END IF;
  
  PERFORM update_all_monthly_points_for_user(NEW.closed_by_user_id, get_year_month_from_date(NEW.deal_date));
  RETURN NEW;
END;
$$;

-- Update handle_guest_attendance_insert to pass team_id
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
      inviter_name || ' ganhou pontos por convidado',
      guest_name || ' compareceu ao encontro: ' || meeting_title,
      NEW.id, '{}'::jsonb, mtg_team_id
    );
    
    PERFORM update_all_monthly_points_for_user(inviter_id, get_year_month_from_date(mtg_date));
  END IF;
  
  RETURN NEW;
END;
$$;