-- v3.37.0 — Planos, descontos, assinaturas e cobranças
CREATE TABLE public.billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  plan_type text NOT NULL DEFAULT 'recorrente',
  audience text NOT NULL DEFAULT 'hub',
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  billing_interval text,
  installments integer,
  contract_template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.billing_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  plan_id uuid REFERENCES public.billing_plans(id) ON DELETE CASCADE,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.billing_plans(id) ON DELETE RESTRICT,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  discount_id uuid REFERENCES public.billing_discounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  amount_cents integer NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_charge_date date,
  provider text,
  external_id text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.billing_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.billing_subscriptions(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  paid_at timestamptz,
  provider text,
  external_id text,
  payment_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_subscriptions_lead ON public.billing_subscriptions(lead_id);
CREATE INDEX idx_billing_subscriptions_profile ON public.billing_subscriptions(profile_id);
CREATE INDEX idx_billing_charges_lead ON public.billing_charges(lead_id);
CREATE INDEX idx_billing_charges_subscription ON public.billing_charges(subscription_id);

GRANT SELECT ON public.billing_plans TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.billing_plans TO authenticated;
GRANT ALL ON public.billing_plans TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_discounts TO authenticated;
GRANT ALL ON public.billing_discounts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_subscriptions TO authenticated;
GRANT ALL ON public.billing_subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_charges TO authenticated;
GRANT ALL ON public.billing_charges TO service_role;

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam planos" ON public.billing_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam descontos" ON public.billing_discounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam assinaturas" ON public.billing_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuario ve suas assinaturas" ON public.billing_subscriptions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins gerenciam cobrancas" ON public.billing_charges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuario ve suas cobrancas" ON public.billing_charges
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE TRIGGER trg_billing_plans_updated BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_billing_discounts_updated BEFORE UPDATE ON public.billing_discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_billing_subscriptions_updated BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_billing_charges_updated BEFORE UPDATE ON public.billing_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validação de datas via trigger (evita CHECK não-imutável)
CREATE OR REPLACE FUNCTION public.billing_validate_discount()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.discount_type NOT IN ('percent','fixed') THEN
    RAISE EXCEPTION 'discount_type inválido';
  END IF;
  IF NEW.discount_type = 'percent' AND (NEW.value < 0 OR NEW.value > 100) THEN
    RAISE EXCEPTION 'Percentual deve estar entre 0 e 100';
  END IF;
  IF NEW.valid_until IS NOT NULL AND TG_OP = 'INSERT' AND NEW.valid_until <= now() THEN
    RAISE EXCEPTION 'Validade do desconto deve ser futura';
  END IF;
  NEW.code := upper(btrim(NEW.code));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_billing_discount_validate
  BEFORE INSERT OR UPDATE ON public.billing_discounts
  FOR EACH ROW EXECUTE FUNCTION public.billing_validate_discount();

-- Preço final da assinatura considerando desconto
CREATE OR REPLACE FUNCTION public.billing_apply_discount()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base_amount integer;
  d RECORD;
BEGIN
  SELECT amount_cents INTO base_amount FROM public.billing_plans WHERE id = NEW.plan_id;
  base_amount := COALESCE(base_amount, 0);

  IF NEW.discount_id IS NOT NULL THEN
    SELECT * INTO d FROM public.billing_discounts WHERE id = NEW.discount_id;
    IF FOUND AND d.active THEN
      IF d.discount_type = 'percent' THEN
        base_amount := GREATEST(0, round(base_amount * (1 - d.value / 100.0))::int);
      ELSE
        base_amount := GREATEST(0, base_amount - round(d.value * 100)::int);
      END IF;
    END IF;
  END IF;

  NEW.amount_cents := base_amount;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_billing_subscription_amount
  BEFORE INSERT OR UPDATE OF plan_id, discount_id ON public.billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.billing_apply_discount();