
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_public_profile(_slug text)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  banner_url text,
  company text,
  "position" text,
  business_segment text,
  bio text,
  what_i_do text,
  ideal_client text,
  how_to_refer_me text,
  linkedin_url text,
  instagram_url text,
  website_url text,
  slug text,
  rank text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.full_name, p.avatar_url, p.banner_url, p.company, p.position,
    p.business_segment, p.bio, p.what_i_do, p.ideal_client, p.how_to_refer_me,
    p.linkedin_url, p.instagram_url, p.website_url, p.slug, p.rank::text
  FROM public.profiles p
  WHERE (p.slug = _slug OR p.id::text = _slug)
    AND p.is_active = true
    AND p.public_profile_enabled = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_referral_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_name TEXT;
  author_team UUID;
BEGIN
  SELECT full_name INTO author_name FROM profiles WHERE id = NEW.user_id;

  SELECT team_id INTO author_team
  FROM team_members
  WHERE user_id = NEW.user_id
  ORDER BY joined_at ASC
  LIMIT 1;

  INSERT INTO activity_feed (user_id, activity_type, title, description, reference_id, team_id, metadata)
  VALUES (
    NEW.user_id,
    'referral_request',
    COALESCE(author_name, 'Um membro') || ' publicou um Pedido de Indicação',
    NEW.title,
    NEW.id,
    author_team,
    jsonb_build_object('target_segment', NEW.target_segment)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_referral_request_insert ON public.referral_requests;
CREATE TRIGGER on_referral_request_insert
  AFTER INSERT ON public.referral_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_request_insert();

CREATE OR REPLACE FUNCTION public.get_group_members_for_notification(_user_id uuid)
RETURNS TABLE (user_id uuid, email text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.email, p.full_name
  FROM team_members tm_self
  JOIN team_members tm_other ON tm_other.team_id = tm_self.team_id
  JOIN profiles p ON p.id = tm_other.user_id
  WHERE tm_self.user_id = _user_id
    AND tm_other.user_id <> _user_id
    AND p.is_active = true
    AND p.email IS NOT NULL
    AND COALESCE(p.email_notifications_enabled, true) = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_members_for_notification(uuid) TO authenticated;
