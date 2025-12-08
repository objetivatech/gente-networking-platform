-- Criar tabela de histórico de pontuação
CREATE TABLE public.points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_before INTEGER NOT NULL,
  points_after INTEGER NOT NULL,
  points_change INTEGER NOT NULL,
  rank_before member_rank,
  rank_after member_rank,
  reason TEXT,
  activity_type TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_points_history_user_id ON public.points_history(user_id);
CREATE INDEX idx_points_history_created_at ON public.points_history(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver próprio histórico"
ON public.points_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todo histórico"
ON public.points_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Atualizar função para registrar histórico
CREATE OR REPLACE FUNCTION public.update_user_points_and_rank(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_points INTEGER;
  old_rank member_rank;
  new_points INTEGER;
  new_rank member_rank;
BEGIN
  -- Obter valores atuais
  SELECT points, rank INTO old_points, old_rank 
  FROM profiles WHERE id = _user_id;
  
  -- Calcular novos valores
  new_points := calculate_user_points(_user_id);
  new_rank := get_rank_from_points(new_points);
  
  -- Atualizar perfil
  UPDATE profiles
  SET points = new_points, rank = new_rank, updated_at = now()
  WHERE id = _user_id;
  
  -- Registrar no histórico apenas se houve mudança
  IF old_points IS DISTINCT FROM new_points THEN
    INSERT INTO points_history (
      user_id, points_before, points_after, points_change,
      rank_before, rank_after
    ) VALUES (
      _user_id, COALESCE(old_points, 0), new_points, 
      new_points - COALESCE(old_points, 0),
      old_rank, new_rank
    );
  END IF;
END;
$$;

-- Função para recalcular pontos de todos os usuários
CREATE OR REPLACE FUNCTION public.recalculate_all_user_points()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  count INTEGER := 0;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    PERFORM update_user_points_and_rank(user_record.id);
    count := count + 1;
  END LOOP;
  
  RETURN count;
END;
$$;