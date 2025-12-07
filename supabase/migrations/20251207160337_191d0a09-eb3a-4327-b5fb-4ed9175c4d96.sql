-- Tabela de convites
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::JSONB
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Convites visíveis para quem criou
CREATE POLICY "Usuários podem ver próprios convites" ON public.invitations
  FOR SELECT USING (auth.uid() = invited_by);

-- Usuários podem criar convites
CREATE POLICY "Usuários podem criar convites" ON public.invitations
  FOR INSERT WITH CHECK (auth.uid() = invited_by);

-- Usuários podem atualizar próprios convites
CREATE POLICY "Usuários podem atualizar próprios convites" ON public.invitations
  FOR UPDATE USING (auth.uid() = invited_by);

-- Admins podem ver todos os convites
CREATE POLICY "Admins podem ver todos convites" ON public.invitations
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Permitir leitura pública do convite pelo código (para página de aceitação)
CREATE POLICY "Convites podem ser lidos pelo código" ON public.invitations
  FOR SELECT USING (true);

-- Função para validar e aceitar convite
CREATE OR REPLACE FUNCTION public.accept_invitation(_code VARCHAR, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'pending' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;
  
  UPDATE invitations
  SET status = 'accepted', accepted_by = _user_id, accepted_at = now()
  WHERE id = invitation_record.id;
  
  -- Add activity to feed
  PERFORM add_activity_feed(
    invitation_record.invited_by,
    'invitation',
    'Novo membro através de convite',
    'Convite aceito por ' || COALESCE((SELECT full_name FROM profiles WHERE id = _user_id), 'novo membro'),
    invitation_record.id
  );
  
  RETURN jsonb_build_object('success', true, 'invited_by', invitation_record.invited_by);
END;
$$;

-- Índices
CREATE INDEX idx_invitations_code ON public.invitations(code);
CREATE INDEX idx_invitations_invited_by ON public.invitations(invited_by);
CREATE INDEX idx_invitations_status ON public.invitations(status);