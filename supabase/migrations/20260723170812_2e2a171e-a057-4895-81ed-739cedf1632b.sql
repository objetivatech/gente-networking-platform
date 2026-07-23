
-- 1) Enum meeting_request_status
DO $$ BEGIN
  CREATE TYPE public.meeting_request_status AS ENUM ('pending','confirmed','declined','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Table meeting_requests
CREATE TABLE IF NOT EXISTS public.meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposed_start TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 480),
  location TEXT,
  message TEXT,
  status public.meeting_request_status NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_requests_requester ON public.meeting_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_recipient ON public.meeting_requests(recipient_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_requests TO authenticated;
GRANT ALL ON public.meeting_requests TO service_role;

ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_requests_select_participants" ON public.meeting_requests;
CREATE POLICY "meeting_requests_select_participants"
  ON public.meeting_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "meeting_requests_insert_requester" ON public.meeting_requests;
CREATE POLICY "meeting_requests_insert_requester"
  ON public.meeting_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND requester_id <> recipient_id);

DROP POLICY IF EXISTS "meeting_requests_update_recipient" ON public.meeting_requests;
CREATE POLICY "meeting_requests_update_recipient"
  ON public.meeting_requests FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "meeting_requests_update_requester_cancel" ON public.meeting_requests;
CREATE POLICY "meeting_requests_update_requester_cancel"
  ON public.meeting_requests FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id AND status = 'pending')
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "meeting_requests_delete_requester" ON public.meeting_requests;
CREATE POLICY "meeting_requests_delete_requester"
  ON public.meeting_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id);

DROP TRIGGER IF EXISTS trg_meeting_requests_updated_at ON public.meeting_requests;
CREATE TRIGGER trg_meeting_requests_updated_at
  BEFORE UPDATE ON public.meeting_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) business_cases.case_type
ALTER TABLE public.business_cases
  ADD COLUMN IF NOT EXISTS case_type TEXT NOT NULL DEFAULT 'externo';

DO $$ BEGIN
  ALTER TABLE public.business_cases
    ADD CONSTRAINT business_cases_case_type_chk CHECK (case_type IN ('plataforma','externo'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.business_cases
  SET case_type = 'plataforma'
  WHERE business_deal_id IS NOT NULL AND case_type <> 'plataforma';

DO $$ BEGIN
  ALTER TABLE public.business_cases
    ADD CONSTRAINT business_cases_platform_needs_deal
    CHECK (case_type = 'externo' OR business_deal_id IS NOT NULL) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) invitations.invite_target
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS invite_target TEXT NOT NULL DEFAULT 'comunidade';

DO $$ BEGIN
  ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_invite_target_chk CHECK (invite_target IN ('comunidade','hub'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NOT VALID: convites antigos sem grupo continuam válidos; regra vale para novos
DO $$ BEGIN
  ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_target_requirements
    CHECK (
      (invite_target = 'comunidade' AND team_id IS NOT NULL)
      OR (invite_target = 'hub' AND email IS NOT NULL)
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) crm_lead_source: adiciona 'convite_membro'
ALTER TYPE public.crm_lead_source ADD VALUE IF NOT EXISTS 'convite_membro';
