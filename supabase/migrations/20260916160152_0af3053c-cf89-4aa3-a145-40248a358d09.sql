REVOKE ALL ON TABLE public.crm_leads FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.crm_leads FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.crm_leads TO authenticated;
GRANT ALL ON TABLE public.crm_leads TO service_role;

CREATE OR REPLACE FUNCTION public.get_guest_journey_directory()
RETURNS TABLE(
  id uuid,
  lead_id uuid,
  profile_id uuid,
  invitation_id uuid,
  full_name text,
  slug text,
  email text,
  phone text,
  company text,
  avatar_url text,
  business_segment text,
  role_current public.app_role,
  journey_status text,
  onboarding_category text,
  source text,
  source_detail text,
  team_id uuid,
  team_name text,
  team_color text,
  invited_by_id uuid,
  invited_by_name text,
  entered_at timestamptz,
  invitation_status text,
  invitation_expires_at timestamptz,
  email_status text,
  email_sent_at timestamptz,
  attendance_count integer,
  can_manage boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN 'admin'::public.app_role
    WHEN public.has_role(auth.uid(), 'facilitador') THEN 'facilitador'::public.app_role
    WHEN public.has_role(auth.uid(), 'membro') THEN 'membro'::public.app_role
    ELSE NULL
  END INTO caller_role;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH facilitator_groups AS (
    SELECT tm.team_id
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid() AND tm.is_facilitator = true
  ),
  lead_rows AS (
    SELECT
      cl.id,
      cl.id AS lead_id,
      cl.profile_id,
      cl.invitation_id,
      COALESCE(p.full_name, cl.name) AS full_name,
      p.slug,
      CASE WHEN caller_role IN ('admin','facilitador') THEN COALESCE(p.email, cl.email) ELSE p.email END AS email,
      CASE WHEN caller_role IN ('admin','facilitador') THEN COALESCE(p.phone, cl.phone) ELSE p.phone END AS phone,
      COALESCE(p.company, cl.company) AS company,
      p.avatar_url,
      COALESCE(p.business_segment, cl.business_segment) AS business_segment,
      ur.role AS role_current,
      CASE
        WHEN ur.role IN ('membro','facilitador','admin') THEN 'promovido_membro'
        WHEN COALESCE(cl.meeting_attendance_count, 0) > 0 THEN 'ja_participou'
        WHEN cl.profile_id IS NOT NULL AND ur.role = 'convidado' THEN 'convidado_ativo'
        WHEN i.status = 'pending' AND cl.onboarding_email_status = 'sent' THEN 'aguardando_ativacao'
        WHEN i.status = 'pending' THEN 'cadastro_recebido'
        ELSE cl.onboarding_status
      END AS journey_status,
      cl.onboarding_category,
      cl.source::text,
      cl.source_detail,
      cl.target_team_id AS team_id,
      t.name AS team_name,
      t.color AS team_color,
      CASE WHEN cl.source = 'convite_manual' THEN cl.invited_by ELSE NULL END AS invited_by_id,
      CASE WHEN cl.source = 'convite_manual' THEN inviter.full_name ELSE NULL END AS invited_by_name,
      cl.created_at AS entered_at,
      i.status::text AS invitation_status,
      i.expires_at AS invitation_expires_at,
      cl.onboarding_email_status AS email_status,
      cl.onboarding_email_sent_at AS email_sent_at,
      cl.meeting_attendance_count::integer AS attendance_count,
      caller_role IN ('admin','facilitador') AS can_manage
    FROM public.crm_leads cl
    LEFT JOIN public.profiles p ON p.id = cl.profile_id
    LEFT JOIN public.user_roles ur ON ur.user_id = cl.profile_id
    LEFT JOIN public.invitations i ON i.id = cl.invitation_id
    LEFT JOIN public.teams t ON t.id = cl.target_team_id
    LEFT JOIN public.profiles inviter ON inviter.id = cl.invited_by
    WHERE cl.archived_at IS NULL
      AND (cl.profile_id IS NULL OR ur.role IN ('convidado','membro','facilitador','admin'))
      AND (
        caller_role = 'admin'
        OR (caller_role = 'facilitador' AND cl.target_team_id IN (SELECT fg.team_id FROM facilitator_groups fg))
        OR (caller_role = 'membro' AND cl.profile_id IS NOT NULL AND ur.role = 'convidado')
      )
  ),
  accepted_without_lead AS (
    SELECT
      p.id,
      NULL::uuid AS lead_id,
      p.id AS profile_id,
      i.id AS invitation_id,
      p.full_name,
      p.slug,
      p.email,
      p.phone,
      p.company,
      p.avatar_url,
      p.business_segment,
      ur.role AS role_current,
      CASE
        WHEN ur.role IN ('membro','facilitador','admin') THEN 'promovido_membro'
        WHEN COALESCE(a.cnt,0) > 0 THEN 'ja_participou'
        ELSE 'convidado_ativo'
      END AS journey_status,
      CASE WHEN i.invite_target = 'hub' THEN 'gente_hub' ELSE 'comunidade' END AS onboarding_category,
      'convite_manual'::text AS source,
      NULL::text AS source_detail,
      i.team_id,
      t.name AS team_name,
      t.color AS team_color,
      i.invited_by AS invited_by_id,
      inviter.full_name AS invited_by_name,
      COALESCE(i.accepted_at, i.created_at) AS entered_at,
      i.status::text AS invitation_status,
      i.expires_at AS invitation_expires_at,
      'sent'::text AS email_status,
      NULL::timestamptz AS email_sent_at,
      COALESCE(a.cnt,0)::integer AS attendance_count,
      caller_role IN ('admin','facilitador') AS can_manage
    FROM public.invitations i
    JOIN public.profiles p ON p.id = i.accepted_by
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    LEFT JOIN public.teams t ON t.id = i.team_id
    LEFT JOIN public.profiles inviter ON inviter.id = i.invited_by
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS cnt
      FROM public.attendances at
      WHERE at.user_id = p.id
    ) a ON true
    WHERE i.status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 FROM public.crm_leads cl
        WHERE cl.archived_at IS NULL AND cl.profile_id = p.id
      )
      AND (
        caller_role = 'admin'
        OR (caller_role = 'facilitador' AND i.team_id IN (SELECT fg.team_id FROM facilitator_groups fg))
        OR (caller_role = 'membro' AND ur.role = 'convidado')
      )
  )
  SELECT * FROM lead_rows
  UNION ALL
  SELECT * FROM accepted_without_lead
  ORDER BY entered_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_journey_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_guest_journey_directory() TO authenticated, service_role;