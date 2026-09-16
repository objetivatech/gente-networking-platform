CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_active_email_unique
  ON public.crm_leads (lower(email))
  WHERE archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_active_phone_unique
  ON public.crm_leads (phone_digits)
  WHERE archived_at IS NULL AND phone_digits IS NOT NULL;