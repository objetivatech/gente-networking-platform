-- Alterar função handle_new_user para criar usuários com role 'convidado' por padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
  
  -- Novos usuários são cadastrados como 'convidado' por padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'convidado');
  
  RETURN NEW;
END;
$$;