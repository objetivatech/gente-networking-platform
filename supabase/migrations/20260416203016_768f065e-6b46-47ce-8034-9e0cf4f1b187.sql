-- Promote suporte@ranktop.com.br to admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'suporte@ranktop.com.br'
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove any non-admin roles for this user (cleanup)
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'suporte@ranktop.com.br')
  AND role != 'admin'::app_role;