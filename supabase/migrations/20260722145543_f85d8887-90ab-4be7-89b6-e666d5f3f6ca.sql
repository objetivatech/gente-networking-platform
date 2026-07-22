
-- =====================================================
-- v3.26.0 — Contract templates, HUB billing, CRM extensions
-- =====================================================

-- 1. contract_templates
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  body_html text NOT NULL,
  variables_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contract templates"
  ON public.contract_templates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. contract_template_versions (snapshot)
CREATE TABLE public.contract_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  name text NOT NULL,
  body_html text NOT NULL,
  variables_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version)
);

GRANT SELECT, INSERT ON public.contract_template_versions TO authenticated;
GRANT ALL ON public.contract_template_versions TO service_role;

ALTER TABLE public.contract_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read contract template versions"
  ON public.contract_template_versions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert contract template versions"
  ON public.contract_template_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. hub_billing_events
CREATE TABLE public.hub_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_billing_events_lead ON public.hub_billing_events(lead_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.hub_billing_events TO authenticated;
GRANT ALL ON public.hub_billing_events TO service_role;

ALTER TABLE public.hub_billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage hub billing events"
  ON public.hub_billing_events
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Extend crm_leads
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS contract_signing_url text,
  ADD COLUMN IF NOT EXISTS contract_template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_template_version integer,
  ADD COLUMN IF NOT EXISTS contract_variables jsonb;

-- 5. Trigger: bump version + snapshot on UPDATE
CREATE OR REPLACE FUNCTION public.contract_templates_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.body_html IS DISTINCT FROM NEW.body_html
    OR OLD.name IS DISTINCT FROM NEW.name
    OR OLD.variables_schema IS DISTINCT FROM NEW.variables_schema
  ) THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();

    INSERT INTO public.contract_template_versions
      (template_id, version, name, body_html, variables_schema, changed_by)
    VALUES
      (NEW.id, NEW.version, NEW.name, NEW.body_html, NEW.variables_schema, auth.uid());
  END IF;

  -- Se marcar como default, desmarca os outros
  IF NEW.is_default THEN
    UPDATE public.contract_templates
      SET is_default = false
      WHERE id <> NEW.id AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contract_templates_snapshot
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.contract_templates_snapshot();

CREATE OR REPLACE FUNCTION public.contract_templates_insert_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.contract_template_versions
    (template_id, version, name, body_html, variables_schema, changed_by)
  VALUES
    (NEW.id, NEW.version, NEW.name, NEW.body_html, NEW.variables_schema, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contract_templates_insert_snapshot
  AFTER INSERT ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.contract_templates_insert_snapshot();

-- 6. Seed default template
INSERT INTO public.contract_templates (slug, name, description, body_html, variables_schema, is_default, is_active)
VALUES (
  'padrao-adesao',
  'Adesão Gente Networking (Padrão)',
  'Contrato padrão de adesão à comunidade Gente Networking.',
  '<h1>Contrato de Adesão — Gente Networking</h1>
<p><strong>Contratante:</strong> {{nome}} ({{email}})</p>
<p><strong>Empresa:</strong> {{empresa}}</p>
<p><strong>Plano:</strong> {{plano}}</p>
<p><strong>Valor:</strong> R$ {{valor}}</p>
<p><strong>Data:</strong> {{data_hoje}}</p>
<p>Este documento formaliza a adesão do contratante ao programa Gente Networking / Gente HUB conforme condições comerciais previamente acordadas.</p>
<p>{{observacoes}}</p>
<p>Ao assinar, o contratante declara estar ciente e de acordo com os termos apresentados.</p>',
  '[
    {"key":"plano","label":"Plano","type":"text","required":true,"placeholder":"Ex.: HUB Anual"},
    {"key":"valor","label":"Valor (R$)","type":"text","required":true,"placeholder":"Ex.: 2.400,00"},
    {"key":"observacoes","label":"Observações","type":"textarea","required":false}
  ]'::jsonb,
  true,
  true
);

-- 7. Update updated_at trigger
CREATE TRIGGER trg_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
