
-- 1. add_activity_feed: nunca derrubar a operação principal
CREATE OR REPLACE FUNCTION public.add_activity_feed(
  _user_id uuid,
  _activity_type text,
  _title text,
  _description text DEFAULT NULL::text,
  _reference_id uuid DEFAULT NULL::uuid,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _team_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO activity_feed (user_id, activity_type, title, description, reference_id, metadata, team_id)
  VALUES (_user_id, _activity_type, _title, _description, _reference_id, COALESCE(_metadata, '{}'::jsonb), _team_id)
  RETURNING id INTO new_id;
  RETURN new_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'add_activity_feed falhou (%): %', _activity_type, SQLERRM;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_activity_feed(
  _user_id uuid,
  _activity_type text,
  _title text,
  _description text DEFAULT NULL::text,
  _reference_id uuid DEFAULT NULL::uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN add_activity_feed(_user_id, _activity_type, _title, _description, _reference_id, _metadata, NULL::uuid);
END;
$function$;

-- 2. deactivate_member: ordem correta dos argumentos + suporte a convidado
CREATE OR REPLACE FUNCTION public.deactivate_member(_member_id uuid, _reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  previous_role app_role;
  previous_team_id uuid;
  teams_removed integer := 0;
  member_name text;
  member_email text;
  lead_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem desativar membros');
  END IF;

  SELECT role INTO previous_role FROM user_roles WHERE user_id = _member_id LIMIT 1;
  IF previous_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível desativar um administrador');
  END IF;

  SELECT full_name, email INTO member_name, member_email FROM profiles WHERE id = _member_id;

  SELECT team_id INTO previous_team_id
  FROM team_members WHERE user_id = _member_id ORDER BY joined_at ASC LIMIT 1;

  DELETE FROM team_members WHERE user_id = _member_id;
  GET DIAGNOSTICS teams_removed = ROW_COUNT;

  -- rebaixa para convidado (perde todos os acessos de membro); convidado permanece convidado
  DELETE FROM user_roles WHERE user_id = _member_id;
  INSERT INTO user_roles (user_id, role) VALUES (_member_id, 'convidado')
  ON CONFLICT DO NOTHING;

  UPDATE profiles
  SET is_active = false,
      deactivated_at = now(),
      deactivation_reason = _reason,
      public_profile_enabled = false
  WHERE id = _member_id;

  UPDATE monthly_points
  SET points = 0, updated_at = now()
  WHERE user_id = _member_id AND year_month = get_current_year_month();

  SELECT id INTO lead_id FROM crm_leads WHERE profile_id = _member_id LIMIT 1;
  IF lead_id IS NULL AND member_email IS NOT NULL THEN
    SELECT id INTO lead_id FROM crm_leads WHERE lower(email) = lower(member_email) LIMIT 1;
  END IF;

  IF lead_id IS NULL THEN
    INSERT INTO crm_leads (name, email, source, source_detail, status, profile_id, target_team_id, notes, metadata)
    VALUES (
      COALESCE(member_name, 'Ex-membro'),
      COALESCE(member_email, _member_id::text || '@sem-email.local'),
      'convite_manual', CASE WHEN previous_role = 'convidado' THEN 'ex_convidado' ELSE 'ex_membro' END,
      'perdido', _member_id, previous_team_id,
      _reason,
      jsonb_build_object('ex_membro', previous_role <> 'convidado', 'deactivated_at', now(), 'previous_role', previous_role::text)
    )
    RETURNING id INTO lead_id;
  ELSE
    UPDATE crm_leads
    SET profile_id = _member_id,
        status = 'perdido',
        source_detail = CASE WHEN previous_role = 'convidado' THEN 'ex_convidado' ELSE 'ex_membro' END,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'ex_membro', previous_role <> 'convidado', 'deactivated_at', now(), 'previous_role', previous_role::text),
        updated_at = now()
    WHERE id = lead_id;
  END IF;

  INSERT INTO crm_lead_history (lead_id, from_status, to_status, moved_by, reason, event_type, metadata)
  VALUES (lead_id, NULL, 'perdido', auth.uid(), _reason, 'member_deactivated',
          jsonb_build_object('previous_role', previous_role::text, 'previous_team_id', previous_team_id));

  PERFORM add_activity_feed(
    _member_id,
    'member_deactivated',
    'Membro desativado',
    COALESCE(_reason, 'Acesso rebaixado para convidado'),
    _member_id,
    jsonb_build_object('previous_role', previous_role::text, 'previous_team_id', previous_team_id),
    previous_team_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'member_id', _member_id,
    'teams_removed', teams_removed,
    'previous_role', previous_role,
    'lead_id', lead_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 3. accept_invitation: idempotente por pessoa (não sobrescreve vínculo original)
CREATE OR REPLACE FUNCTION public.accept_invitation(_code character varying, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  existing_accepted RECORD;
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

  -- Idempotência por pessoa: já existe convite aceito → preserva o vínculo original
  SELECT * INTO existing_accepted
  FROM invitations
  WHERE accepted_by = _user_id
    AND status = 'accepted'
    AND COALESCE(metadata->>'superseded', 'false') <> 'true'
  ORDER BY accepted_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE invitations
    SET metadata = COALESCE(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'superseded', true,
        'superseded_reason', 'usuario_ja_possui_convite_aceito',
        'superseded_by_invitation', existing_accepted.id,
        'superseded_at', now()
      )
    WHERE id = invitation_record.id;

    RETURN jsonb_build_object(
      'success', true,
      'invited_by', existing_accepted.invited_by,
      'team_id', existing_accepted.team_id,
      'invite_target', existing_accepted.invite_target,
      'invite_purpose', existing_accepted.invite_purpose,
      'event_id', existing_accepted.event_id,
      'already_accepted', true,
      'kept_original', true
    );
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
$function$;

-- 4. Match automático por e-mail: só como fallback seguro
CREATE OR REPLACE FUNCTION public.handle_new_user_invitation_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pending_invitation RECORD;
  pending_count integer;
  metadata_code text;
BEGIN
  -- Já possui convite aceito → não mexe no vínculo
  IF EXISTS (
    SELECT 1 FROM invitations
    WHERE accepted_by = NEW.id AND status = 'accepted'
  ) THEN
    RETURN NEW;
  END IF;

  -- Código explícito informado no cadastro tem prioridade absoluta
  SELECT NULLIF(u.raw_user_meta_data->>'invitation_code', '')
    INTO metadata_code
  FROM auth.users u WHERE u.id = NEW.id;

  IF metadata_code IS NOT NULL THEN
    PERFORM accept_invitation(metadata_code, NEW.id);
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO pending_count
  FROM invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > now();

  -- Ambiguidade (mais de um convite pendente para o mesmo e-mail): não adivinhar
  IF pending_count <> 1 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO pending_invitation
  FROM invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF FOUND THEN
    PERFORM accept_invitation(pending_invitation.code, NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Higienização: convites aceitos duplicados (mantém o mais antigo)
WITH ranked AS (
  SELECT id, accepted_by,
         row_number() OVER (PARTITION BY accepted_by ORDER BY accepted_at ASC, created_at ASC) AS rn
  FROM invitations
  WHERE status = 'accepted' AND accepted_by IS NOT NULL
)
UPDATE invitations i
SET metadata = COALESCE(i.metadata, '{}'::jsonb)
  || jsonb_build_object('superseded', true, 'superseded_reason', 'duplicado_historico', 'superseded_at', now())
FROM ranked r
WHERE r.id = i.id AND r.rn > 1;

-- 6. Backfill do snapshot de grupos permitidos nos convites aceitos
UPDATE invitations i
SET metadata = COALESCE(i.metadata, '{}'::jsonb)
  || jsonb_build_object('allowed_team_ids', jsonb_build_array(COALESCE(i.team_id, t.team_id)))
FROM (
  SELECT inv.id AS inv_id, (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = inv.invited_by ORDER BY tm.joined_at ASC LIMIT 1
  ) AS team_id
  FROM invitations inv
  WHERE inv.status = 'accepted'
) t
WHERE t.inv_id = i.id
  AND i.status = 'accepted'
  AND (i.metadata->'allowed_team_ids' IS NULL OR i.metadata->'allowed_team_ids' = '[]'::jsonb)
  AND COALESCE(i.team_id, t.team_id) IS NOT NULL;
