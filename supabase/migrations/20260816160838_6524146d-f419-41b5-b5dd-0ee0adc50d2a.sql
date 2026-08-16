CREATE OR REPLACE FUNCTION public.get_integration_secret(_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE v text;
BEGIN
  SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = _name LIMIT 1;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_integration_secret(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_integration_secret(text) TO service_role;