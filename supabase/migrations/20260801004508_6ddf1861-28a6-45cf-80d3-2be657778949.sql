ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'premium_group';

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS invite_purpose text,
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Esta restrição antiga foi criada como NOT VALID e há convites históricos
-- aceitos sem team_id. Qualquer UPDATE neles falha. A trigger abaixo substitui
-- a regra com validação por propósito apenas para o estado atual do registro.
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_target_requirements;

UPDATE public.invitations
SET invite_purpose = CASE
  WHEN invite_target = 'comunidade' THEN 'premium_group'
  WHEN invite_target = 'hub' THEN 'hub_legacy'
  ELSE 'premium_group'
END
WHERE invite_purpose IS NULL;

ALTER TABLE public.invitations
  ALTER COLUMN invite_purpose SET DEFAULT 'premium_group',
  ALTER COLUMN invite_purpose SET NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_gente_event_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type NOT IN ('premium_group', 'hub_event') THEN
    RAISE EXCEPTION 'Tipo de evento inválido';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_gente_event_type_trigger ON public.meetings;
CREATE TRIGGER validate_gente_event_type_trigger
BEFORE INSERT OR UPDATE OF event_type ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.validate_gente_event_type();

CREATE OR REPLACE FUNCTION public.validate_invitation_purpose()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_purpose NOT IN ('premium_group', 'hub_event', 'whatsapp_community', 'hub_legacy') THEN
    RAISE EXCEPTION 'Propósito de convite inválido';
  END IF;

  IF NEW.invite_purpose = 'premium_group' AND NEW.team_id IS NULL THEN
    RAISE EXCEPTION 'Convite para grupo premium exige grupo';
  END IF;

  IF NEW.invite_purpose = 'hub_event' AND NEW.event_id IS NULL THEN
    RAISE EXCEPTION 'Convite para Gente HUB exige evento';
  END IF;

  IF NEW.invite_purpose IN ('hub_event', 'whatsapp_community', 'hub_legacy') THEN
    NEW.team_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_invitation_purpose_trigger ON public.invitations;
CREATE TRIGGER validate_invitation_purpose_trigger
BEFORE INSERT OR UPDATE OF invite_purpose, team_id, event_id ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.validate_invitation_purpose();

CREATE INDEX IF NOT EXISTS invitations_event_id_idx ON public.invitations(event_id);
CREATE INDEX IF NOT EXISTS invitations_invite_purpose_idx ON public.invitations(invite_purpose);
CREATE INDEX IF NOT EXISTS meetings_event_type_date_idx ON public.meetings(event_type, meeting_date);

CREATE OR REPLACE FUNCTION public.accept_invitation(_code character varying, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  resolved_team_id uuid;
  guest_email text;
  guest_name text;
  new_lead_id uuid;
BEGIN
  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'accepted' AND accepted_by = _user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'invited_by', invitation_record.invited_by,
      'team_id', invitation_record.team_id,
      'invite_target', invitation_record.invite_target,
      'invite_purpose', invitation_record.invite_purpose,
      'event_id', invitation_record.event_id,
      'already_accepted', true
    );
  END IF;

  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  IF invitation_record.invite_purpose = 'whatsapp_community' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este convite deve ser concluído pela página da Comunidade Gente'
    );
  END IF;

  IF invitation_record.invite_purpose IN ('hub_event', 'hub_legacy') THEN
    SELECT email, full_name INTO guest_email, guest_name
    FROM profiles WHERE id = _user_id;

    SELECT id INTO new_lead_id
    FROM crm_leads
    WHERE lower(email) = lower(COALESCE(guest_email, invitation_record.email))
    ORDER BY created_at DESC
    LIMIT 1;

    IF new_lead_id IS NULL THEN
      INSERT INTO crm_leads (
        name, email, phone, source, source_detail, status,
        invited_by, invitation_id, profile_id, notes, metadata
      )
      VALUES (
        COALESCE(guest_name, invitation_record.name, 'Convidado Gente HUB'),
        COALESCE(guest_email, invitation_record.email),
        invitation_record.metadata->>'phone',
        'convite_membro'::crm_lead_source,
        CASE WHEN invitation_record.event_id IS NOT NULL
          THEN 'Convite para evento Gente HUB'
          ELSE 'Convite Gente HUB legado'
        END,
        'novo'::crm_lead_status,
        invitation_record.invited_by,
        invitation_record.id,
        _user_id,
        NULLIF(invitation_record.metadata->>'hub_context', ''),
        COALESCE(invitation_record.metadata, '{}'::jsonb)
          || jsonb_build_object('event_id', invitation_record.event_id)
      )
      RETURNING id INTO new_lead_id;
    ELSE
      UPDATE crm_leads
      SET invited_by = COALESCE(invited_by, invitation_record.invited_by),
          invitation_id = invitation_record.id,
          profile_id = COALESCE(profile_id, _user_id),
          metadata = COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object('event_id', invitation_record.event_id),
          updated_at = now()
      WHERE id = new_lead_id;
    END IF;

    IF invitation_record.event_id IS NOT NULL THEN
      INSERT INTO attendances (meeting_id, user_id)
      VALUES (invitation_record.event_id, _user_id)
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE invitations
    SET status = 'accepted',
        accepted_by = _user_id,
        accepted_at = now(),
        metadata = COALESCE(metadata, '{}'::jsonb)
          || jsonb_build_object('crm_lead_id', new_lead_id)
    WHERE id = invitation_record.id;

    PERFORM add_activity_feed(
      invitation_record.invited_by,
      'invitation',
      CASE WHEN invitation_record.event_id IS NOT NULL
        THEN 'Convite para evento Gente HUB aceito'
        ELSE 'Convite Gente HUB aceito'
      END,
      'Novo lead indicado por você foi registrado no CRM.',
      invitation_record.id,
      jsonb_build_object(
        'crm_lead_id', new_lead_id,
        'invite_purpose', invitation_record.invite_purpose,
        'event_id', invitation_record.event_id
      ),
      NULL
    );

    RETURN jsonb_build_object(
      'success', true,
      'invited_by', invitation_record.invited_by,
      'invite_target', 'hub',
      'invite_purpose', invitation_record.invite_purpose,
      'event_id', invitation_record.event_id,
      'crm_lead_id', new_lead_id,
      'already_accepted', false
    );
  END IF;

  resolved_team_id := invitation_record.team_id;
  IF resolved_team_id IS NULL THEN
    SELECT tm.team_id INTO resolved_team_id
    FROM team_members tm
    WHERE tm.user_id = invitation_record.invited_by
    ORDER BY tm.joined_at ASC
    LIMIT 1;
  END IF;

  UPDATE invitations
  SET status = 'accepted',
      accepted_by = _user_id,
      accepted_at = now(),
      team_id = COALESCE(team_id, resolved_team_id),
      metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'allowed_team_ids',
          CASE WHEN resolved_team_id IS NOT NULL
            THEN jsonb_build_array(resolved_team_id)
            ELSE '[]'::jsonb
          END
        )
  WHERE id = invitation_record.id;

  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id) THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (_user_id, 'convidado')
    ON CONFLICT DO NOTHING;
  END IF;

  PERFORM add_activity_feed(
    invitation_record.invited_by,
    'invitation',
    'Novo convidado através de convite',
    'Convite aceito por ' || COALESCE(
      (SELECT full_name FROM profiles WHERE id = _user_id),
      'novo convidado'
    ),
    invitation_record.id,
    jsonb_build_object('invite_purpose', 'premium_group'),
    resolved_team_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'invited_by', invitation_record.invited_by,
    'team_id', resolved_team_id,
    'invite_target', 'comunidade',
    'invite_purpose', 'premium_group',
    'already_accepted', false
  );
END;
$$;