-- Adicionar campo slug para URL amigável
ALTER TABLE public.profiles 
ADD COLUMN slug TEXT UNIQUE,
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN deactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deactivation_reason TEXT;

-- Criar índice para busca por slug
CREATE INDEX idx_profiles_slug ON public.profiles(slug);

-- Criar índice para busca de membros ativos
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Função para gerar slug a partir do nome
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_slug TEXT;
BEGIN
  -- Converter para minúsculas, remover acentos e caracteres especiais
  base_slug := lower(unaccent(name));
  -- Substituir espaços e caracteres não alfanuméricos por hífens
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  -- Remover hífens duplicados
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  -- Remover hífens no início e fim
  base_slug := trim(both '-' from base_slug);
  
  RETURN base_slug;
END;
$$;

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION public.generate_unique_slug(name TEXT, user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := generate_slug(name);
  new_slug := base_slug;
  
  -- Verificar se slug já existe (exceto para o próprio usuário)
  WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = new_slug AND id != user_id) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN new_slug;
END;
$$;

-- Trigger para gerar slug automaticamente ao criar/atualizar perfil
CREATE OR REPLACE FUNCTION public.handle_profile_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gerar slug se não existir ou se o nome mudou
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.full_name != NEW.full_name) THEN
    NEW.slug := generate_unique_slug(NEW.full_name, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_slug_update
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_slug();

-- Habilitar extensão unaccent se não existir
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Gerar slugs para todos os perfis existentes
UPDATE public.profiles 
SET slug = generate_unique_slug(full_name, id)
WHERE slug IS NULL;