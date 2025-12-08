-- Trigger para recalcular pontos ao deletar depoimento
CREATE OR REPLACE FUNCTION public.handle_testimonial_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM update_user_points_and_rank(OLD.from_user_id);
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_testimonial_delete
  AFTER DELETE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION handle_testimonial_delete();

-- Trigger para recalcular pontos ao deletar indicação
CREATE OR REPLACE FUNCTION public.handle_referral_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM update_user_points_and_rank(OLD.from_user_id);
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_referral_delete
  AFTER DELETE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION handle_referral_delete();

-- Trigger para recalcular pontos ao deletar negócio
CREATE OR REPLACE FUNCTION public.handle_business_deal_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM update_user_points_and_rank(OLD.closed_by_user_id);
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_business_deal_delete
  AFTER DELETE ON public.business_deals
  FOR EACH ROW EXECUTE FUNCTION handle_business_deal_delete();

-- Trigger para recalcular pontos ao deletar Gente em Ação
CREATE OR REPLACE FUNCTION public.handle_gente_em_acao_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM update_user_points_and_rank(OLD.user_id);
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_gente_em_acao_delete
  AFTER DELETE ON public.gente_em_acao
  FOR EACH ROW EXECUTE FUNCTION handle_gente_em_acao_delete();

-- Trigger para recalcular pontos ao deletar presença
CREATE OR REPLACE FUNCTION public.handle_attendance_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inviter_id UUID;
BEGIN
  -- Recalcular pontos do usuário que teve presença removida
  PERFORM update_user_points_and_rank(OLD.user_id);
  
  -- Se era um convidado, recalcular pontos do convidador também
  SELECT invited_by INTO inviter_id
  FROM invitations
  WHERE accepted_by = OLD.user_id AND status = 'accepted'
  LIMIT 1;
  
  IF inviter_id IS NOT NULL THEN
    PERFORM update_user_points_and_rank(inviter_id);
  END IF;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_attendance_delete
  AFTER DELETE ON public.attendances
  FOR EACH ROW EXECUTE FUNCTION handle_attendance_delete();