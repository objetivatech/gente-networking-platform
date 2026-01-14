/*
  # Restrição de Acesso por Grupo
  
  ## Alterações de Segurança
  
  Este migration implementa restrições de acesso baseadas em grupos (times/equipes):
  
  1. **Função Auxiliar**
     - `get_user_teams(user_id)`: Retorna lista de times do usuário
     - `are_same_team(user_id1, user_id2)`: Verifica se dois usuários estão no mesmo time
  
  2. **Políticas RLS Atualizadas**
     - Membros só podem ver outros membros do mesmo grupo
     - Admins e Facilitadores têm acesso amplo
     - Convidados têm acesso muito limitado
  
  ## Tabelas Afetadas
  
  - profiles: Restrição de visualização por grupo
  - gente_em_acao: Apenas membros do mesmo time podem ver
  - testimonials: Apenas membros do mesmo time podem trocar depoimentos
  - referrals: Apenas membros do mesmo time podem fazer indicações
  - business_deals: Apenas membros do mesmo time podem ver negócios
  - activity_feed: Feed restrito ao time
  
  ## Notas Importantes
  
  - Admins e Facilitadores mantêm acesso total
  - Membros só veem dados de seu próprio time
  - Convidados têm acesso mínimo
*/

-- Criar função para obter times do usuário
CREATE OR REPLACE FUNCTION get_user_teams(_user_id uuid)
RETURNS TABLE (team_id uuid) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = _user_id;
$$;

-- Criar função para verificar se dois usuários estão no mesmo time
CREATE OR REPLACE FUNCTION are_same_team(_user_id1 uuid, _user_id2 uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm1
    INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = _user_id1
    AND tm2.user_id = _user_id2
  );
$$;

-- Remover políticas antigas de profiles
DROP POLICY IF EXISTS "Users can view all active profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view active profiles" ON profiles;

-- Nova política: Membros só podem ver perfis do mesmo time, Admins/Facilitadores veem todos
CREATE POLICY "Users can view team profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Admin vê todos
    has_role(auth.uid(), 'admin')
    OR
    -- Facilitador vê todos
    has_role(auth.uid(), 'facilitador')
    OR
    -- Próprio perfil
    id = auth.uid()
    OR
    -- Membros do mesmo time
    (are_same_team(auth.uid(), id) AND is_active = true)
  );

-- Atualizar política de gente_em_acao
DROP POLICY IF EXISTS "Authenticated users can view gente em ação" ON gente_em_acao;
DROP POLICY IF EXISTS "Authenticated users can view all gente em ação records" ON gente_em_acao;

CREATE POLICY "Users can view team gente em ação"
  ON gente_em_acao FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'facilitador')
    OR user_id = auth.uid()
    OR (partner_id = auth.uid())
    OR are_same_team(auth.uid(), user_id)
  );

-- Atualizar política de testimonials
DROP POLICY IF EXISTS "Users can view all testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authenticated users can view testimonials" ON testimonials;

CREATE POLICY "Users can view team testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'facilitador')
    OR from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR are_same_team(auth.uid(), from_user_id)
    OR are_same_team(auth.uid(), to_user_id)
  );

-- Limitar criação de depoimentos apenas entre membros do mesmo time
DROP POLICY IF EXISTS "Users can create testimonials" ON testimonials;

CREATE POLICY "Users can create testimonials for team members"
  ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'facilitador')
      OR are_same_team(auth.uid(), to_user_id)
    )
  );

-- Atualizar política de referrals
DROP POLICY IF EXISTS "Users can view all referrals" ON referrals;

CREATE POLICY "Users can view team referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'facilitador')
    OR from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR are_same_team(auth.uid(), from_user_id)
    OR are_same_team(auth.uid(), to_user_id)
  );

-- Limitar criação de indicações apenas para membros do mesmo time
DROP POLICY IF EXISTS "Users can create referrals" ON referrals;

CREATE POLICY "Users can create referrals for team members"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'facilitador')
      OR are_same_team(auth.uid(), to_user_id)
    )
  );

-- Atualizar política de business_deals
DROP POLICY IF EXISTS "Authenticated users can view all business deals" ON business_deals;

CREATE POLICY "Users can view team business deals"
  ON business_deals FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'facilitador')
    OR closed_by_user_id = auth.uid()
    OR referred_by_user_id = auth.uid()
    OR are_same_team(auth.uid(), closed_by_user_id)
  );

-- Atualizar política de activity_feed
DROP POLICY IF EXISTS "Authenticated users can view all activities" ON activity_feed;

CREATE POLICY "Users can view team activity feed"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'facilitador')
    OR user_id = auth.uid()
    OR are_same_team(auth.uid(), user_id)
  );
