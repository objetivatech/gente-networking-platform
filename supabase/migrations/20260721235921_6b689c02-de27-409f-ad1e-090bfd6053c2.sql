
-- v3.25.0 — CRM: HUB, Contratos, Promoção e Auditoria

-- 1. Enum: novo status hub_ativo
ALTER TYPE public.crm_lead_status ADD VALUE IF NOT EXISTS 'hub_ativo' BEFORE 'fechado';

-- 2. teams.is_hub flag
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_hub boolean NOT NULL DEFAULT false;

-- 3. crm_leads: novas colunas
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS is_hub boolean GENERATED ALWAYS AS (source = 'lp_gentehub'::crm_lead_source) STORED,
  ADD COLUMN IF NOT EXISTS contract_signed_pdf_path text,
  ADD COLUMN IF NOT EXISTS contract_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz;

-- 4. crm_lead_history: novas colunas
ALTER TABLE public.crm_lead_history
  ADD COLUMN IF NOT EXISTS source_snapshot crm_lead_source,
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'status_change',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS crm_lead_history_lead_created_idx
  ON public.crm_lead_history (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_lead_history_moved_by_idx
  ON public.crm_lead_history (moved_by);
CREATE INDEX IF NOT EXISTS crm_lead_history_event_type_idx
  ON public.crm_lead_history (event_type);

-- 5. Trigger BEFORE INSERT: rotear lead HUB para grupo com is_hub=true se target_team_id não definido
CREATE OR REPLACE FUNCTION public.crm_leads_route_hub()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  hub_team_id uuid;
BEGIN
  IF NEW.source = 'lp_gentehub' AND NEW.target_team_id IS NULL THEN
    SELECT id INTO hub_team_id FROM public.teams WHERE is_hub = true ORDER BY created_at ASC LIMIT 1;
    IF hub_team_id IS NOT NULL THEN
      NEW.target_team_id := hub_team_id;
    ELSE
      NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb)
        || jsonb_build_object('warnings', jsonb_build_array('no_hub_team_configured'));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_route_hub_trigger ON public.crm_leads;
CREATE TRIGGER crm_leads_route_hub_trigger
  BEFORE INSERT ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_leads_route_hub();

-- 6. Trigger AFTER UPDATE: gatilho de cobrança HUB ao virar 'qualificado'
CREATE OR REPLACE FUNCTION public.crm_leads_hub_billing_hook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.source = 'lp_gentehub'
     AND NEW.status = 'qualificado'
     AND OLD.status IS DISTINCT FROM 'qualificado'
     AND COALESCE(NEW.payment_status, '') <> 'paid' THEN

    UPDATE public.crm_leads
      SET payment_status = 'pending'
      WHERE id = NEW.id AND (payment_status IS NULL OR payment_status = '');

    INSERT INTO public.crm_lead_history (lead_id, from_status, to_status, moved_by, reason, source_snapshot, event_type, metadata)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'hub_billing_triggered', NEW.source, 'hub_billing_triggered',
            jsonb_build_object('system', true));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_hub_billing_trigger ON public.crm_leads;
CREATE TRIGGER crm_leads_hub_billing_trigger
  AFTER UPDATE OF status ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_leads_hub_billing_hook();

-- 7. Atualiza função de log de histórico para preencher moved_by, source_snapshot e event_type
CREATE OR REPLACE FUNCTION public.crm_leads_log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.crm_lead_history (lead_id, from_status, to_status, moved_by, reason, source_snapshot, event_type, metadata)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), 'lead_created', NEW.source, 'status_change',
            jsonb_build_object('system', auth.uid() IS NULL));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.crm_lead_history (lead_id, from_status, to_status, moved_by, reason, source_snapshot, event_type, metadata)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL, NEW.source, 'status_change',
            jsonb_build_object('system', auth.uid() IS NULL));
  END IF;
  RETURN NEW;
END;
$$;

-- 8. RPC: promover lead para membro com validações
CREATE OR REPLACE FUNCTION public.promote_crm_lead_to_member(
  _lead_id uuid,
  _team_id uuid,
  _skip_contract boolean DEFAULT false,
  _skip_payment boolean DEFAULT false,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lead_rec RECORD;
  promo_result jsonb;
  needs_contract boolean;
  needs_payment boolean;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem promover leads');
  END IF;

  SELECT * INTO lead_rec FROM public.crm_leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado');
  END IF;

  IF lead_rec.profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead ainda não criou conta na plataforma');
  END IF;

  IF _team_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.teams WHERE id = _team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selecione um grupo destino válido');
  END IF;

  needs_contract := (lead_rec.source = 'lp_gentehub');
  needs_payment := (lead_rec.source = 'lp_gentehub');

  IF needs_contract AND NOT _skip_contract AND COALESCE(lead_rec.contract_status, '') <> 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrato ainda não foi assinado');
  END IF;

  IF needs_payment AND NOT _skip_payment AND COALESCE(lead_rec.payment_status, '') <> 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pagamento ainda não foi confirmado');
  END IF;

  IF (_skip_contract OR _skip_payment) AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo obrigatório ao pular contrato ou pagamento');
  END IF;

  promo_result := public.promote_guest_to_member(lead_rec.profile_id, 'membro'::app_role, _team_id);
  IF NOT COALESCE((promo_result->>'success')::boolean, false) THEN
    RETURN promo_result;
  END IF;

  UPDATE public.crm_leads
    SET status = 'fechado', target_team_id = _team_id
    WHERE id = _lead_id;

  INSERT INTO public.crm_lead_history (lead_id, from_status, to_status, moved_by, reason, source_snapshot, event_type, metadata)
  VALUES (_lead_id, lead_rec.status, 'fechado'::crm_lead_status, auth.uid(),
          COALESCE(_reason, 'promoted_to_member'),
          lead_rec.source, 'promoted',
          jsonb_build_object(
            'team_id', _team_id,
            'skip_contract', _skip_contract,
            'skip_payment', _skip_payment
          ));

  RETURN jsonb_build_object('success', true, 'lead_id', _lead_id, 'user_id', lead_rec.profile_id, 'team_id', _team_id);
END;
$$;

-- 9. RPC: adicionar nota no histórico do lead (admin/facilitador com acesso)
CREATE OR REPLACE FUNCTION public.add_crm_lead_note(_lead_id uuid, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lead_rec RECORD;
  caller_role app_role;
BEGIN
  IF _note IS NULL OR btrim(_note) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nota vazia');
  END IF;

  SELECT * INTO lead_rec FROM public.crm_leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado');
  END IF;

  SELECT role INTO caller_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF caller_role NOT IN ('admin', 'facilitador') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  IF caller_role = 'facilitador' AND lead_rec.target_team_id IS NOT NULL
     AND NOT public.is_team_facilitator(lead_rec.target_team_id, auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você só vê leads do seu grupo');
  END IF;

  INSERT INTO public.crm_lead_history (lead_id, from_status, to_status, moved_by, reason, source_snapshot, event_type, metadata)
  VALUES (_lead_id, lead_rec.status, lead_rec.status, auth.uid(), _note, lead_rec.source, 'note_added', '{}'::jsonb);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. Grants
GRANT EXECUTE ON FUNCTION public.promote_crm_lead_to_member(uuid, uuid, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_crm_lead_note(uuid, text) TO authenticated;

-- 11. RLS extra: garantir que crm_lead_history seja legível para admin/facilitador (usa policies existentes; adicionamos INSERT via SECURITY DEFINER apenas)
