-- Atualizar função que cria perfil para incluir phone, company e business_segment do cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, company, business_segment)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'company',
    new.raw_user_meta_data ->> 'business_segment'
  );
  RETURN new;
END;
$$;