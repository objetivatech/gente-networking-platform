-- Create all missing triggers for gamification and activity feed
-- These functions exist but NO triggers were ever created

-- 1. Profile slug generation
CREATE TRIGGER trigger_profile_slug
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_slug();

-- 2. New user creation
CREATE TRIGGER trigger_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Testimonial insert → activity feed + points
CREATE TRIGGER trigger_testimonial_insert
  AFTER INSERT ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_testimonial_insert();

-- 4. Testimonial delete → recalculate points
CREATE TRIGGER trigger_testimonial_delete
  AFTER DELETE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_testimonial_delete();

-- 5. Referral insert → activity feed + points
CREATE TRIGGER trigger_referral_insert
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_insert();

-- 6. Referral delete → recalculate points
CREATE TRIGGER trigger_referral_delete
  AFTER DELETE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_delete();

-- 7. Business deal insert → activity feed + points
CREATE TRIGGER trigger_business_deal_insert
  AFTER INSERT ON public.business_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_business_deal_insert();

-- 8. Business deal delete → recalculate points
CREATE TRIGGER trigger_business_deal_delete
  AFTER DELETE ON public.business_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_business_deal_delete();

-- 9. Gente em Ação insert → activity feed + points
CREATE TRIGGER trigger_gente_em_acao_insert
  AFTER INSERT ON public.gente_em_acao
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_gente_em_acao_insert();

-- 10. Gente em Ação delete → recalculate points
CREATE TRIGGER trigger_gente_em_acao_delete
  AFTER DELETE ON public.gente_em_acao
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_gente_em_acao_delete();

-- 11. Attendance insert → activity feed + points
CREATE TRIGGER trigger_attendance_insert
  AFTER INSERT ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_attendance_insert();

-- 12. Attendance delete → recalculate points
CREATE TRIGGER trigger_attendance_delete
  AFTER DELETE ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_attendance_delete();

-- 13. Guest attendance → bonus points for inviter
CREATE TRIGGER trigger_guest_attendance_insert
  AFTER INSERT ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_guest_attendance_insert();

-- 14. Council reply insert → activity feed + points
CREATE TRIGGER trigger_council_reply_insert
  AFTER INSERT ON public.council_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_council_reply_insert();

-- 15. Best answer update → bonus points
CREATE TRIGGER trigger_best_answer_update
  AFTER UPDATE OF is_best_answer ON public.council_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_best_answer_update();

-- 16. Invitation accepted → activity feed + points
CREATE TRIGGER trigger_invitation_accepted
  AFTER UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_accepted();

-- 17. Updated_at column triggers
CREATE TRIGGER trigger_updated_at_teams
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_updated_at_council_posts
  BEFORE UPDATE ON public.council_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_updated_at_contents
  BEFORE UPDATE ON public.contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_updated_at_business_cases
  BEFORE UPDATE ON public.business_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 18. Business case insert → points for author
CREATE OR REPLACE FUNCTION public.handle_business_case_insert()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  author_name TEXT;
  referrer_id UUID;
  user_team UUID;
BEGIN
  SELECT full_name INTO author_name FROM profiles WHERE id = NEW.user_id;
  SELECT team_id INTO user_team FROM team_members WHERE user_id = NEW.user_id LIMIT 1;
  
  -- Activity feed entry
  PERFORM add_activity_feed(
    NEW.user_id, 'business_case',
    author_name || ' publicou um case de negócio',
    'Case: ' || NEW.title,
    NEW.id, '{}'::jsonb, user_team
  );
  
  -- Update points for case author
  PERFORM update_all_monthly_points_for_user(NEW.user_id);
  
  -- If linked to a business deal with a referrer, update referrer points too
  IF NEW.business_deal_id IS NOT NULL THEN
    SELECT referred_by_user_id INTO referrer_id 
    FROM business_deals WHERE id = NEW.business_deal_id;
    
    IF referrer_id IS NOT NULL THEN
      PERFORM update_all_monthly_points_for_user(referrer_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_business_case_insert
  AFTER INSERT ON public.business_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_business_case_insert();

-- 19. Business case delete → recalculate points
CREATE OR REPLACE FUNCTION public.handle_business_case_delete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM update_all_monthly_points_for_user(OLD.user_id);
  RETURN OLD;
END;
$function$;

CREATE TRIGGER trigger_business_case_delete
  AFTER DELETE ON public.business_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_business_case_delete();