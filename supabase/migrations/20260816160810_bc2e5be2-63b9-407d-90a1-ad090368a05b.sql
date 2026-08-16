-- v3.36.0 — Cofre de chaves de integração (Vault) + auditoria
CREATE TABLE IF NOT EXISTS public.integration_secret_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name text NOT NULL,
  action text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_secret_audit TO authenticated;
GRANT ALL ON public.integration_secret_audit TO service_role;
ALTER TABLE public.integration_secret_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin le auditoria de chaves" ON public.integration_secret_audit;
CREATE POLICY "admin le auditoria de chaves" ON public.integration_secret_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_integration_secret(_name text, _value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  existing_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores');
  END IF;
  IF _name !~ '^[A-Z][A-Z0-9_]{2,255}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome de chave inválido');
  END IF;
  IF _value IS NULL OR btrim(_value) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor vazio');
  END IF;

  SELECT id INTO existing_id FROM vault.secrets WHERE name = _name;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(_value, _name, 'Integração Gente');
  ELSE
    PERFORM vault.update_secret(existing_id, _value, _name, 'Integração Gente');
  END IF;

  INSERT INTO public.integration_secret_audit (secret_name, action, changed_by)
  VALUES (_name, CASE WHEN existing_id IS NULL THEN 'created' ELSE 'updated' END, auth.uid());

  RETURN jsonb_build_object('success', true, 'name', _name);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_integration_secret(_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores');
  END IF;
  DELETE FROM vault.secrets WHERE name = _name;
  INSERT INTO public.integration_secret_audit (secret_name, action, changed_by)
  VALUES (_name, 'deleted', auth.uid());
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_integration_secrets()
RETURNS TABLE(name text, updated_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT s.name::text, s.updated_at FROM vault.secrets s;
END;
$$;

REVOKE ALL ON FUNCTION public.set_integration_secret(text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.delete_integration_secret(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.list_integration_secrets() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_integration_secret(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_integration_secret(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_integration_secrets() TO authenticated;

-- v3.36.0 — Leads do CRM vinculados a encontros Gente HUB
CREATE TABLE IF NOT EXISTS public.meeting_lead_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, lead_id)
);
GRANT SELECT, INSERT, DELETE ON public.meeting_lead_attendances TO authenticated;
GRANT ALL ON public.meeting_lead_attendances TO service_role;
ALTER TABLE public.meeting_lead_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comunidade le presencas de leads" ON public.meeting_lead_attendances;
CREATE POLICY "comunidade le presencas de leads" ON public.meeting_lead_attendances
  FOR SELECT TO authenticated USING (public.is_community_member(auth.uid()));

DROP POLICY IF EXISTS "gestao vincula leads a encontros" ON public.meeting_lead_attendances;
CREATE POLICY "gestao vincula leads a encontros" ON public.meeting_lead_attendances
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facilitador'));

DROP POLICY IF EXISTS "gestao remove leads de encontros" ON public.meeting_lead_attendances;
CREATE POLICY "gestao remove leads de encontros" ON public.meeting_lead_attendances
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facilitador'));

-- Registra o vínculo na trilha de auditoria do lead
CREATE OR REPLACE FUNCTION public.meeting_lead_attendance_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_rec RECORD;
  mtg_title text;
BEGIN
  SELECT * INTO lead_rec FROM public.crm_leads WHERE id = COALESCE(NEW.lead_id, OLD.lead_id);
  SELECT title INTO mtg_title FROM public.meetings WHERE id = COALESCE(NEW.meeting_id, OLD.meeting_id);

  INSERT INTO public.crm_lead_history (lead_id, from_status, to_status, moved_by, reason, source_snapshot, event_type, metadata)
  VALUES (
    lead_rec.id, lead_rec.status, lead_rec.status, auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN 'Vinculado ao encontro: ' ELSE 'Removido do encontro: ' END || COALESCE(mtg_title, 'Gente HUB'),
    lead_rec.source,
    CASE WHEN TG_OP = 'INSERT' THEN 'hub_meeting_linked' ELSE 'hub_meeting_unlinked' END,
    jsonb_build_object('meeting_id', COALESCE(NEW.meeting_id, OLD.meeting_id))
  );

  IF TG_OP = 'INSERT' THEN
    UPDATE public.crm_leads
      SET status = CASE WHEN status = 'novo' THEN 'em_qualificacao'::crm_lead_status ELSE status END,
          updated_at = now()
    WHERE id = NEW.lead_id;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_lead_attendance_log ON public.meeting_lead_attendances;
CREATE TRIGGER trg_meeting_lead_attendance_log
AFTER INSERT OR DELETE ON public.meeting_lead_attendances
FOR EACH ROW EXECUTE FUNCTION public.meeting_lead_attendance_log();