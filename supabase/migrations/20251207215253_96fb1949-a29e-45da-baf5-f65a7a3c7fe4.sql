-- Criar função para verificar se usuário é facilitador de uma equipe específica
CREATE OR REPLACE FUNCTION public.is_team_facilitator(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
      AND is_facilitator = true
  )
$$;

-- Criar função para verificar se um usuário tem role de convidado
CREATE OR REPLACE FUNCTION public.is_guest(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'convidado'
  )
$$;

-- Atualizar política de team_members para facilitadores
-- Facilitadores só podem adicionar convidados às suas próprias equipes
DROP POLICY IF EXISTS "Admins e facilitadores podem gerenciar membros" ON public.team_members;

-- Admin pode tudo
CREATE POLICY "Admins podem gerenciar todos membros"
ON public.team_members
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Facilitador pode adicionar apenas convidados à sua equipe
CREATE POLICY "Facilitadores podem adicionar convidados à sua equipe"
ON public.team_members
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'facilitador')
  AND public.is_team_facilitator(auth.uid(), team_id)
  AND public.is_guest(user_id)
);

-- Facilitador pode remover membros da sua equipe
CREATE POLICY "Facilitadores podem remover membros da sua equipe"
ON public.team_members
FOR DELETE
USING (
  public.has_role(auth.uid(), 'facilitador')
  AND public.is_team_facilitator(auth.uid(), team_id)
);

-- Trigger para atualizar pontos quando um convite é aceito
CREATE OR REPLACE FUNCTION public.handle_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT full_name INTO inviter_name FROM profiles WHERE id = NEW.invited_by;
    
    -- Adicionar atividade
    PERFORM add_activity_feed(
      NEW.invited_by, 'invitation',
      inviter_name || ' teve um convite aceito',
      'Novo membro: ' || COALESCE((SELECT full_name FROM profiles WHERE id = NEW.accepted_by), 'Convidado'),
      NEW.id
    );
    
    -- Atualizar pontos do convidador (bonus por trazer novo membro)
    PERFORM update_user_points_and_rank(NEW.invited_by);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para convites aceitos
DROP TRIGGER IF EXISTS on_invitation_accepted ON public.invitations;
CREATE TRIGGER on_invitation_accepted
  AFTER UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_accepted();

-- Atualizar função de cálculo de pontos para incluir convites aceitos
CREATE OR REPLACE FUNCTION public.calculate_user_points(_user_id uuid)
RETURNS integer
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
  
  -- Convites aceitos: 30 pontos cada
  SELECT COUNT(*) INTO invitation_count FROM invitations WHERE invited_by = _user_id AND status = 'accepted';
  total_points := total_points + (invitation_count * 30);
  
  RETURN total_points;
END;
$$;