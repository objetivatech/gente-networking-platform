ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_reports_enabled boolean NOT NULL DEFAULT true;