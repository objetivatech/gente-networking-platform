CREATE TABLE public.crm_lead_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key text NOT NULL UNIQUE,
  page_url text,
  title text,
  source public.crm_lead_source,
  leads_count integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crm_lead_pages TO authenticated;
GRANT ALL ON public.crm_lead_pages TO service_role;

ALTER TABLE public.crm_lead_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lead pages"
ON public.crm_lead_pages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_crm_lead_pages_updated_at
BEFORE UPDATE ON public.crm_lead_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.register_crm_lead_page(
  _page_key text,
  _page_url text,
  _title text,
  _source public.crm_lead_source
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _page_key IS NULL OR btrim(_page_key) = '' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.crm_lead_pages (page_key, page_url, title, source, leads_count)
  VALUES (btrim(_page_key), _page_url, _title, _source, 1)
  ON CONFLICT (page_key) DO UPDATE
    SET leads_count = public.crm_lead_pages.leads_count + 1,
        last_seen_at = now(),
        page_url = COALESCE(EXCLUDED.page_url, public.crm_lead_pages.page_url),
        title = COALESCE(EXCLUDED.title, public.crm_lead_pages.title),
        source = COALESCE(EXCLUDED.source, public.crm_lead_pages.source)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;