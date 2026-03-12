
-- Add new profile fields for enhanced member profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS what_i_do text,
  ADD COLUMN IF NOT EXISTS ideal_client text,
  ADD COLUMN IF NOT EXISTS how_to_refer_me text;

-- Create business_cases table
CREATE TABLE IF NOT EXISTS business_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_deal_id UUID REFERENCES business_deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  result TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for business_cases
ALTER TABLE business_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cases visíveis para autenticados" ON business_cases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar próprios cases" ON business_cases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar próprios cases" ON business_cases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprios cases" ON business_cases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin pode gerenciar qualquer case" ON business_cases
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_business_cases_user_id ON business_cases(user_id);
