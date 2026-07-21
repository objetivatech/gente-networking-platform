
CREATE TYPE public.crm_lead_source AS ENUM (
  'lp_gentehub','lp_participe','lp_networking','site_elementor','convite_manual','api'
);

CREATE TYPE public.crm_lead_status AS ENUM (
  'novo','em_qualificacao','qualificado','fechado','perdido'
);

CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  business_segment TEXT,
  source public.crm_lead_source NOT NULL DEFAULT 'api',
  source_detail TEXT,
  target_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status public.crm_lead_status NOT NULL DEFAULT 'novo',
  notes TEXT,
  invited_by UUID,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  profile_id UUID,
  meeting_attendance_count INT NOT NULL DEFAULT 0,
  first_attendance_at TIMESTAMPTZ,
  contract_status TEXT,
  payment_status TEXT,
  efi_subscription_id TEXT,
  autentique_document_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX crm_leads_email_unique ON public.crm_leads (lower(email));
CREATE INDEX crm_leads_status_idx ON public.crm_leads (status);
CREATE INDEX crm_leads_source_idx ON public.crm_leads (source);
CREATE INDEX crm_leads_target_team_idx ON public.crm_leads (target_team_id);
CREATE INDEX crm_leads_profile_idx ON public.crm_leads (profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on crm_leads"
ON public.crm_leads FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Facilitators select own team leads"
ON public.crm_leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'facilitador')
  AND target_team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = crm_leads.target_team_id
      AND tm.user_id = auth.uid()
      AND tm.is_facilitator = true
  )
);

CREATE POLICY "Facilitators update own team leads"
ON public.crm_leads FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'facilitador')
  AND target_team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = crm_leads.target_team_id
      AND tm.user_id = auth.uid()
      AND tm.is_facilitator = true
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'facilitador')
  AND target_team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = crm_leads.target_team_id
      AND tm.user_id = auth.uid()
      AND tm.is_facilitator = true
  )
);

CREATE TRIGGER crm_leads_set_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  from_status public.crm_lead_status,
  to_status public.crm_lead_status NOT NULL,
  moved_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX crm_lead_history_lead_idx ON public.crm_lead_history (lead_id, created_at DESC);

GRANT SELECT, INSERT ON public.crm_lead_history TO authenticated;
GRANT ALL ON public.crm_lead_history TO service_role;

ALTER TABLE public.crm_lead_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on crm_lead_history"
ON public.crm_lead_history FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Facilitators view history of own leads"
ON public.crm_lead_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    JOIN public.team_members tm ON tm.team_id = l.target_team_id
    WHERE l.id = crm_lead_history.lead_id
      AND tm.user_id = auth.uid()
      AND tm.is_facilitator = true
  )
);

CREATE OR REPLACE FUNCTION public.crm_leads_log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.crm_lead_history (lead_id, from_status, to_status, moved_by, reason)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), 'created');
    RETURN NEW;
  END IF;
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.crm_lead_history (lead_id, from_status, to_status, moved_by, reason)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_leads_history_trigger
AFTER INSERT OR UPDATE OF status ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.crm_leads_log_status_change();

CREATE OR REPLACE FUNCTION public.crm_sync_attendance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  v_user_id := NEW.user_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'convidado') THEN
    RETURN NEW;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_user_id;

  UPDATE public.crm_leads
     SET status = CASE WHEN status = 'novo' THEN 'em_qualificacao'::crm_lead_status ELSE status END,
         meeting_attendance_count = meeting_attendance_count + 1,
         first_attendance_at = COALESCE(first_attendance_at, now()),
         profile_id = COALESCE(profile_id, v_user_id)
   WHERE profile_id = v_user_id
      OR (v_email IS NOT NULL AND lower(email) = lower(v_email));

  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_leads_attendance_sync
AFTER INSERT ON public.attendances
FOR EACH ROW EXECUTE FUNCTION public.crm_sync_attendance();

CREATE OR REPLACE FUNCTION public.crm_sync_role_promotion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  IF NEW.role IN ('membro', 'facilitador') THEN
    SELECT email INTO v_email FROM public.profiles WHERE id = NEW.user_id;
    UPDATE public.crm_leads
       SET status = 'fechado',
           profile_id = COALESCE(profile_id, NEW.user_id)
     WHERE (profile_id = NEW.user_id
            OR (v_email IS NOT NULL AND lower(email) = lower(v_email)))
       AND status <> 'fechado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_leads_role_sync
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.crm_sync_role_promotion();
