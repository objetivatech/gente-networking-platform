
CREATE OR REPLACE FUNCTION public.accept_invitation(_code character varying, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  resolved_team_id UUID;
  guest_email TEXT;
  guest_name TEXT;
  new_lead_id UUID;
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
      'already_accepted', true
    );
  END IF;

  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  IF invitation_record.invite_target = 'hub' THEN
    SELECT email, full_name INTO guest_email, guest_name
    FROM profiles WHERE id = _user_id;

    INSERT INTO crm_leads (name, email, phone, source, source_detail, status, invited_by, invitation_id, profile_id, notes)
    VALUES (
      COALESCE(guest_name, invitation_record.name, 'Convidado Gente HUB'),
      COALESCE(guest_email, invitation_record.email),
      NULL,
      'convite_membro'::crm_lead_source,
      'Convite de membro (código ' || invitation_record.code || ')',
      'novo'::crm_lead_status,
      invitation_record.invited_by,
      invitation_record.id,
      _user_id,
      NULLIF(invitation_record.metadata->>'hub_context','')
    )
    RETURNING id INTO new_lead_id;

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
      'Convite Gente HUB aceito',
      'Novo lead HUB indicado por você foi registrado no CRM.',
      invitation_record.id,
      jsonb_build_object('crm_lead_id', new_lead_id, 'invite_target', 'hub'),
      NULL
    );

    RETURN jsonb_build_object(
      'success', true,
      'invited_by', invitation_record.invited_by,
      'invite_target', 'hub',
      'crm_lead_id', new_lead_id,
      'already_accepted', false
    );
  END IF;

  -- Comunidade
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
      metadata = COALESCE(metadata, '{}'::jsonb) ||
                 jsonb_build_object('allowed_team_ids',
                                    CASE WHEN resolved_team_id IS NOT NULL
                                         THEN jsonb_build_array(resolved_team_id)
                                         ELSE '[]'::jsonb
                                    END)
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
    'Convite aceito por ' || COALESCE((SELECT full_name FROM profiles WHERE id = _user_id), 'novo convidado'),
    invitation_record.id,
    '{}'::jsonb,
    resolved_team_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'invited_by', invitation_record.invited_by,
    'team_id', resolved_team_id,
    'invite_target', 'comunidade',
    'already_accepted', false
  );
END;
$function$;
