
-- Helper: quem é membro ativo da comunidade (membro, facilitador ou admin)
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','facilitador','membro')
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ MURAL DE OPORTUNIDADES (Item 7) ============
CREATE TABLE public.opportunities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'servico',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Oportunidades visíveis para membros"
  ON public.opportunities FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid()));

CREATE POLICY "Membros podem criar oportunidades"
  ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_community_member(auth.uid()));

CREATE POLICY "Autor pode editar oportunidade"
  ON public.opportunities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Autor pode deletar oportunidade"
  ON public.opportunities FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PEDIDOS DE INDICAÇÃO / BROADCAST (Item 3) ============
CREATE TABLE public.referral_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  target_segment text,
  status text NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_requests TO authenticated;
GRANT ALL ON public.referral_requests TO service_role;
ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pedidos visíveis para membros"
  ON public.referral_requests FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid()));

CREATE POLICY "Membros podem criar pedidos"
  ON public.referral_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_community_member(auth.uid()));

CREATE POLICY "Autor pode editar pedido"
  ON public.referral_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Autor pode deletar pedido"
  ON public.referral_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_referral_requests_updated_at
  BEFORE UPDATE ON public.referral_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Respostas a pedidos de indicação
CREATE TABLE public.referral_request_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.referral_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_request_responses TO authenticated;
GRANT ALL ON public.referral_request_responses TO service_role;
ALTER TABLE public.referral_request_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Respostas visíveis para membros"
  ON public.referral_request_responses FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid()));

CREATE POLICY "Membros podem responder pedidos"
  ON public.referral_request_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_community_member(auth.uid()));

CREATE POLICY "Autor pode editar resposta"
  ON public.referral_request_responses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Autor ou admin pode deletar resposta"
  ON public.referral_request_responses FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
