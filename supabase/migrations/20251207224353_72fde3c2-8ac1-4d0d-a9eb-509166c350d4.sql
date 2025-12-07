-- Adicionar coluna para imagem no gente_em_acao
ALTER TABLE public.gente_em_acao 
ADD COLUMN IF NOT EXISTS image_url text;