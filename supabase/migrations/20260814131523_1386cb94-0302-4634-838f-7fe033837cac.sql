
-- 1) Proteção de origem + arquivamento (soft delete)
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS stage_key text;

CREATE OR REPLACE FUNCTION public.crm_leads_protect_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.source IS DISTINCT FROM NEW.source
     AND OLD.source IN ('lp_gentehub','lp_participe','lp_networking','site_elementor')
     AND NEW.source = 'convite_manual' THEN
    NEW.source := OLD.source;
    NEW.source_detail := COALESCE(NEW.source_detail, OLD.source_detail);
  END IF;
  -- metadata nunca é zerado por sincronização
  IF NEW.metadata IS NULL OR NEW.metadata = '{}'::jsonb THEN
    NEW.metadata := COALESCE(OLD.metadata, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_protect_source_trigger ON public.crm_leads;
CREATE TRIGGER crm_leads_protect_source_trigger
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.crm_leads_protect_source();

-- 2) Colunas configuráveis do funil
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#1E3A5F',
  position integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  notify_on_enter boolean NOT NULL DEFAULT false,
  notify_emails text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crm_pipeline_stages TO authenticated;
GRANT ALL ON public.crm_pipeline_stages TO service_role;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stages readable by staff" ON public.crm_pipeline_stages;
CREATE POLICY "stages readable by staff" ON public.crm_pipeline_stages
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'facilitador'));

DROP POLICY IF EXISTS "stages managed by admin" ON public.crm_pipeline_stages;
CREATE POLICY "stages managed by admin" ON public.crm_pipeline_stages
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

GRANT INSERT, UPDATE, DELETE ON public.crm_pipeline_stages TO authenticated;

DROP TRIGGER IF EXISTS crm_pipeline_stages_updated_at ON public.crm_pipeline_stages;
CREATE TRIGGER crm_pipeline_stages_updated_at
BEFORE UPDATE ON public.crm_pipeline_stages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_pipeline_stages (key, label, color, position, is_system, notify_on_enter)
VALUES
  ('novo','Novo','#64748B',1,true,true),
  ('em_qualificacao','Em Qualificação','#F7941D',2,true,false),
  ('qualificado','Qualificado','#0EA5E9',3,true,true),
  ('hub_ativo','HUB Ativo','#C79A2E',4,true,true),
  ('fechado','Fechado','#16A34A',5,true,true),
  ('perdido','Perdido','#DC2626',6,true,false)
ON CONFLICT (key) DO NOTHING;

-- stage_key acompanha o status do enum quando não há coluna customizada
CREATE OR REPLACE FUNCTION public.crm_leads_sync_stage_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage_key IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
         AND NEW.stage_key IS NOT DISTINCT FROM OLD.stage_key) THEN
    NEW.stage_key := NEW.status::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_sync_stage_key_trigger ON public.crm_leads;
CREATE TRIGGER crm_leads_sync_stage_key_trigger
BEFORE INSERT OR UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.crm_leads_sync_stage_key();

UPDATE public.crm_leads SET stage_key = status::text WHERE stage_key IS NULL;

-- 3) Configurações de integrações (sem chaves de API)
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE CHECK (category IN ('payments','signature','email')),
  provider text,
  environment text NOT NULL DEFAULT 'sandbox',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  rate_limit_count integer,
  rate_limit_window_hours integer,
  last_checked_at timestamptz,
  last_check_ok boolean,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integrations admin only" ON public.integration_settings;
CREATE POLICY "integrations admin only" ON public.integration_settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS integration_settings_updated_at ON public.integration_settings;
CREATE TRIGGER integration_settings_updated_at
BEFORE UPDATE ON public.integration_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.integration_settings (category, provider, environment)
VALUES ('payments', NULL, 'sandbox'),
       ('signature','autentique','production'),
       ('email','resend','production')
ON CONFLICT (category) DO NOTHING;

-- 4) Log de disparos (limite X envios em Y horas)
CREATE TABLE IF NOT EXISTS public.notification_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'email',
  provider text,
  recipient text NOT NULL,
  subject text,
  context text,
  reference_id uuid,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_dispatch_log TO authenticated;
GRANT ALL ON public.notification_dispatch_log TO service_role;
ALTER TABLE public.notification_dispatch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispatch log admin read" ON public.notification_dispatch_log;
CREATE POLICY "dispatch log admin read" ON public.notification_dispatch_log
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_dispatch_log_created ON public.notification_dispatch_log (created_at DESC);
