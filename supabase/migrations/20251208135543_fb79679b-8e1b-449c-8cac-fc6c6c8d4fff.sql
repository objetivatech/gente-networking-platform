-- Criar tabela de changelog do sistema
CREATE TABLE public.system_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  description text,
  changes jsonb DEFAULT '[]'::jsonb,
  category text DEFAULT 'feature',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_changelog ENABLE ROW LEVEL SECURITY;

-- Políticas: todos autenticados podem ver, apenas admins podem gerenciar
CREATE POLICY "Changelog visível para autenticados"
  ON public.system_changelog FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar changelog"
  ON public.system_changelog FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Inserir entradas iniciais do changelog
INSERT INTO public.system_changelog (version, title, description, category, changes) VALUES
('1.0.0', 'Lançamento Inicial', 'Versão inicial do sistema Gente Networking', 'release', 
  '["Sistema de autenticação completo", "Dashboard com feed de atividades", "Sistema de pontuação e ranks", "Gestão de equipes e membros", "Registro de Gente em Ação", "Depoimentos entre membros", "Indicações de contatos", "Registro de negócios", "Calendário de encontros", "Sistema de convites"]'::jsonb),
('1.1.0', 'Melhorias de Cadastro', 'Aprimoramentos no formulário de cadastro e recuperação de senha', 'feature',
  '["Máscara automática de telefone brasileiro", "Verificação de email duplicado", "Confirmação de senha", "Indicador de força da senha", "Recuperação de senha via email"]'::jsonb),
('1.2.0', 'Diretório de Membros', 'Nova funcionalidade para consulta de perfis', 'feature',
  '["Página de diretório de membros", "Visualização de perfis completos", "Filtro por nome e empresa", "Acesso restrito (apenas membros)"]'::jsonb);