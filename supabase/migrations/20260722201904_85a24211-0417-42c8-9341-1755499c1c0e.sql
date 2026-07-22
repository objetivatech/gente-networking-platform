
-- Índices p/ auditoria
CREATE INDEX IF NOT EXISTS idx_crm_history_created_at ON public.crm_lead_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_history_event_type ON public.crm_lead_history (event_type);

-- Reatribuição em massa de modelo de contrato (admin-only, aditiva)
CREATE OR REPLACE FUNCTION public.reassign_contract_template(
  _template_id uuid,
  _version int,
  _lead_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int := 0;
  v_skipped int := 0;
  v_lead record;
  v_tpl record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores.');
  END IF;

  SELECT id, name, version INTO v_tpl
  FROM public.contract_templates WHERE id = _template_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Modelo não encontrado.');
  END IF;

  FOR v_lead IN
    SELECT id, contract_status, contract_template_id, contract_template_version, source, status
    FROM public.crm_leads
    WHERE id = ANY(_lead_ids)
  LOOP
    -- Nunca sobrescreve contrato já enviado/assinado
    IF v_lead.contract_status IN ('sent', 'signed') THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    UPDATE public.crm_leads
       SET contract_template_id = _template_id,
           contract_template_version = COALESCE(_version, v_tpl.version)
     WHERE id = v_lead.id;

    INSERT INTO public.crm_lead_history (
      lead_id, from_status, to_status, moved_by, reason,
      source_snapshot, event_type, metadata
    ) VALUES (
      v_lead.id, v_lead.status, v_lead.status, auth.uid(), 'template_reassigned',
      v_lead.source, 'contract_template_reassigned',
      jsonb_build_object(
        'from_template', v_lead.contract_template_id,
        'from_version', v_lead.contract_template_version,
        'to_template', _template_id,
        'to_version', COALESCE(_version, v_tpl.version),
        'template_name', v_tpl.name
      )
    );

    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated', v_updated, 'skipped', v_skipped);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassign_contract_template(uuid, int, uuid[]) TO authenticated;
