-- Adicionar campo business_segment à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN business_segment text;