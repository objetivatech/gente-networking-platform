CREATE TABLE public.crm_historical_captures (
 source_project text NOT NULL,
 source_record_id uuid NOT NULL,
 source_page_id uuid,
 captured_at timestamptz NOT NULL,
 payload jsonb NOT NULL,
 decision text NOT NULL DEFAULT 'pending_review',
 lead_id uuid REFERENCES public.crm_leads(id),
 profile_ids uuid[] NOT NULL DEFAULT '{}',
 invitation_ids uuid[] NOT NULL DEFAULT '{}',
 match_details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (source_project,source_record_id)
);
GRANT SELECT ON public.crm_historical_captures TO authenticated;
GRANT ALL ON public.crm_historical_captures TO service_role;
ALTER TABLE public.crm_historical_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY historical_captures_admin_read ON public.crm_historical_captures FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER historical_captures_updated_at BEFORE UPDATE ON public.crm_historical_captures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON TABLE public.crm_historical_captures IS 'Historical acquisition provenance only; never activation, attendance, billing or automatic rescue. No public access.';