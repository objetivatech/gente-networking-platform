
-- Trigger for council_posts INSERT -> activity_feed
CREATE OR REPLACE FUNCTION public.handle_council_post_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  author_name TEXT;
BEGIN
  SELECT full_name INTO author_name FROM profiles WHERE id = NEW.user_id;
  
  PERFORM add_activity_feed(
    NEW.user_id, 'council_post',
    COALESCE(author_name, 'Membro') || ' abriu um desafio no Conselho 24/7',
    NEW.title,
    NEW.id, '{}'::jsonb, NEW.team_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_council_post_insert
  AFTER INSERT ON council_posts
  FOR EACH ROW EXECUTE FUNCTION handle_council_post_insert();

-- Trigger for profile UPDATE -> activity_feed (only significant changes)
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_team UUID;
BEGIN
  -- Only fire for significant field changes
  IF (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.company IS DISTINCT FROM NEW.company OR
    OLD.position IS DISTINCT FROM NEW.position OR
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
    OLD.banner_url IS DISTINCT FROM NEW.banner_url OR
    OLD.what_i_do IS DISTINCT FROM NEW.what_i_do OR
    OLD.ideal_client IS DISTINCT FROM NEW.ideal_client OR
    OLD.how_to_refer_me IS DISTINCT FROM NEW.how_to_refer_me OR
    OLD.tags IS DISTINCT FROM NEW.tags
  ) THEN
    SELECT team_id INTO user_team FROM team_members WHERE user_id = NEW.id LIMIT 1;
    
    PERFORM add_activity_feed(
      NEW.id, 'profile_update',
      NEW.full_name || ' atualizou seu perfil',
      NULL,
      NEW.id, '{}'::jsonb, user_team
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_profile_update();
