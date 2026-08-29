CREATE TABLE IF NOT EXISTS public.crm_identity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'already_member_blocked',
  email text,
  phone_digits text,
  matched_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source public.crm_lead_source,
  page_key text,
  page_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crm_identity_events TO authenticated;
GRANT ALL ON public.crm_identity_events TO service_role;

ALTER TABLE public.crm_identity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver eventos de identidade" ON public.crm_identity_events;
CREATE POLICY "Admins podem ver eventos de identidade"
ON public.crm_identity_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_crm_identity_events_created ON public.crm_identity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_identity_events_type ON public.crm_identity_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_lead_history_event_created ON public.crm_lead_history (event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.crm_log_identity_block(
  _email text,
  _phone_digits text,
  _matched_profile_id uuid,
  _source public.crm_lead_source,
  _page_key text,
  _page_url text,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.crm_identity_events (
    event_type, email, phone_digits, matched_profile_id, source, page_key, page_url, metadata
  ) VALUES (
    'already_member_blocked', lower(btrim(_email)), _phone_digits, _matched_profile_id,
    _source, NULLIF(btrim(COALESCE(_page_key, '')), ''), _page_url, COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_log_identity_block(text, text, uuid, public.crm_lead_source, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_log_identity_block(text, text, uuid, public.crm_lead_source, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.crm_register_known_page(
  _page_key text,
  _page_url text DEFAULT NULL,
  _title text DEFAULT NULL,
  _source public.crm_lead_source DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem cadastrar páginas de captação';
  END IF;

  IF _page_key IS NULL OR btrim(_page_key) = '' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.crm_lead_pages (page_key, page_url, title, source, leads_count)
  VALUES (btrim(_page_key), _page_url, _title, _source, 0)
  ON CONFLICT (page_key) DO UPDATE
    SET page_url = COALESCE(EXCLUDED.page_url, public.crm_lead_pages.page_url),
        title = COALESCE(EXCLUDED.title, public.crm_lead_pages.title),
        source = COALESCE(public.crm_lead_pages.source, EXCLUDED.source),
        updated_at = now()
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_register_known_page(text, text, text, public.crm_lead_source) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_register_known_page(text, text, text, public.crm_lead_source) TO authenticated, service_role;