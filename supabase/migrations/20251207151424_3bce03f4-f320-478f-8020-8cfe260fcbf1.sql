
-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'facilitador', 'membro', 'convidado');

-- Enum para classificação/gamificação
CREATE TYPE public.member_rank AS ENUM ('iniciante', 'bronze', 'prata', 'ouro', 'diamante');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  rank member_rank DEFAULT 'iniciante',
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela separada de roles (segurança contra privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'membro',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tabela de equipes
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#22c55e',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vínculo membro ↔ equipe
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_facilitator BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- Encontros quinzenais
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  location TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Presenças nos encontros
CREATE TABLE public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (meeting_id, user_id)
);

-- Gente em Ação (reuniões 1-a-1)
CREATE TABLE public.gente_em_acao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('membro', 'convidado')),
  guest_name TEXT,
  guest_company TEXT,
  notes TEXT,
  meeting_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Depoimentos
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Negócios Realizados
CREATE TABLE public.business_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closed_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name TEXT,
  description TEXT,
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  deal_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indicações
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feed de atividades (timeline consolidada)
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  reference_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gente_em_acao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'membro');
  
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil ao cadastrar
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para profiles
CREATE POLICY "Perfis são visíveis para usuários autenticados"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem editar próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies para user_roles (apenas admins podem gerenciar)
CREATE POLICY "Roles visíveis para autenticados"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerenciar roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para teams
CREATE POLICY "Equipes visíveis para autenticados"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerenciar equipes"
  ON public.teams FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para team_members
CREATE POLICY "Membros de equipe visíveis para autenticados"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins e facilitadores podem gerenciar membros"
  ON public.team_members FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'facilitador')
  );

-- RLS Policies para meetings
CREATE POLICY "Encontros visíveis para autenticados"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins e facilitadores podem gerenciar encontros"
  ON public.meetings FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'facilitador')
  );

-- RLS Policies para attendances
CREATE POLICY "Presenças visíveis para autenticados"
  ON public.attendances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem registrar própria presença"
  ON public.attendances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar presenças"
  ON public.attendances FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para gente_em_acao
CREATE POLICY "Gente em Ação visível para autenticados"
  ON public.gente_em_acao FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem registrar próprias reuniões"
  ON public.gente_em_acao FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar próprias reuniões"
  ON public.gente_em_acao FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprias reuniões"
  ON public.gente_em_acao FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies para testimonials
CREATE POLICY "Depoimentos visíveis para autenticados"
  ON public.testimonials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem criar depoimentos"
  ON public.testimonials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Usuários podem editar próprios depoimentos"
  ON public.testimonials FOR UPDATE
  TO authenticated
  USING (auth.uid() = from_user_id);

CREATE POLICY "Usuários podem deletar próprios depoimentos"
  ON public.testimonials FOR DELETE
  TO authenticated
  USING (auth.uid() = from_user_id);

-- RLS Policies para business_deals
CREATE POLICY "Negócios visíveis para autenticados"
  ON public.business_deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem registrar próprios negócios"
  ON public.business_deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = closed_by_user_id);

CREATE POLICY "Usuários podem editar próprios negócios"
  ON public.business_deals FOR UPDATE
  TO authenticated
  USING (auth.uid() = closed_by_user_id);

CREATE POLICY "Usuários podem deletar próprios negócios"
  ON public.business_deals FOR DELETE
  TO authenticated
  USING (auth.uid() = closed_by_user_id);

-- RLS Policies para referrals
CREATE POLICY "Indicações visíveis para autenticados"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem criar indicações"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Usuários podem editar próprias indicações"
  ON public.referrals FOR UPDATE
  TO authenticated
  USING (auth.uid() = from_user_id);

CREATE POLICY "Usuários podem deletar próprias indicações"
  ON public.referrals FOR DELETE
  TO authenticated
  USING (auth.uid() = from_user_id);

-- RLS Policies para activity_feed
CREATE POLICY "Feed visível para autenticados"
  ON public.activity_feed FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema pode inserir no feed"
  ON public.activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
