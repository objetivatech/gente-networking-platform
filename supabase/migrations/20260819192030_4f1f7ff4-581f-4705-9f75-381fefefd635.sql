ALTER TABLE public.integration_settings DROP CONSTRAINT IF EXISTS integration_settings_category_check;
ALTER TABLE public.integration_settings ADD CONSTRAINT integration_settings_category_check
  CHECK (category IN ('payments','signature','email','rescue'));