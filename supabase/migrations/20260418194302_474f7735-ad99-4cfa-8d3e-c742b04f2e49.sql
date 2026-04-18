-- ============================================================
-- INVITATION FLOW REFACTOR v2
-- 1) Add team_id to invitations
-- 2) Reform accept_invitation to insert into team_members
-- 3) Auto-match invitations on user signup (trigger)
-- 4) New RPC transfer_guest_to_team
-- 5) Retroactive fix for existing guests/invites
-- ============================================================

-- ---------- 1. SCHEMA ----------
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_email_pending
  ON public.invitations (lower(email)) WHERE status = 'pending';

-- ---------- 2. accept_invitation REFORMED ----------
CREATE OR REPLACE FUNCTION public.accept_invitation(_code character varying, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  resolved_team_id UUID;
BEGIN
  -- Idempotência: já aceito por este usuário
  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'accepted' AND accepted_by = _user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'invited_by', invitation_record.invited_by,
      'team_id', invitation_record.team_id,
      'already_accepted', true
    );
  END IF;

  -- Convite pendente válido
  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  -- Resolver team_id: usar o do convite; se NULL, fallback para primeiro grupo do inviter
  resolved_team_id := invitation_record.team_id;
  IF resolved_team_id IS NULL THEN
    SELECT tm.team_id INTO resolved_team_id
    FROM team_members tm
    WHERE tm.user_id = invitation_record.invited_by
    ORDER BY tm.joined_at ASC
    LIMIT 1;
  END IF;

  -- Marcar convite como aceito
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

  -- Atribuir role 'convidado' (se ainda não tem nenhuma role)
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id) THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (_user_id, 'convidado')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Inserir em team_members no grupo correto
  IF resolved_team_id IS NOT NULL THEN
    INSERT INTO team_members (user_id, team_id, is_facilitator)
    VALUES (_user_id, resolved_team_id, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Activity feed
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
    'already_accepted', false
  );
END;
$function$;

-- ---------- 3. TRIGGER: auto-match on signup by email ----------
CREATE OR REPLACE FUNCTION public.handle_new_user_invitation_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pending_invitation RECORD;
BEGIN
  -- Procura convite pendente cujo email bata com o do novo usuário
  SELECT * INTO pending_invitation
  FROM invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    PERFORM accept_invitation(pending_invitation.code, NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

-- O trigger roda APÓS handle_new_user (que cria o profile)
DROP TRIGGER IF EXISTS on_auth_user_created_invitation_match ON auth.users;
CREATE TRIGGER on_auth_user_created_invitation_match
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_invitation_match();

-- ---------- 4. RPC: transfer_guest_to_team ----------
CREATE OR REPLACE FUNCTION public.transfer_guest_to_team(
  _guest_id uuid,
  _new_team_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role app_role;
  is_caller_facilitator_of_source BOOLEAN := false;
  current_team_id UUID;
BEGIN
  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'facilitador') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para transferir convidados');
  END IF;

  -- Validar grupo destino
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = _new_team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Grupo destino inexistente');
  END IF;

  SELECT team_id INTO current_team_id FROM team_members WHERE user_id = _guest_id LIMIT 1;

  -- Facilitador só pode transferir convidados do PRÓPRIO grupo
  IF caller_role = 'facilitador' THEN
    IF current_team_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Convidado sem grupo de origem');
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid() AND team_id = current_team_id AND is_facilitator = true
    ) INTO is_caller_facilitator_of_source;

    IF NOT is_caller_facilitator_of_source THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você só pode transferir convidados do seu grupo');
    END IF;
  END IF;

  -- Remover de todos os grupos antigos
  DELETE FROM team_members WHERE user_id = _guest_id;

  -- Inserir no novo grupo
  INSERT INTO team_members (user_id, team_id, is_facilitator)
  VALUES (_guest_id, _new_team_id, false);

  -- Atualizar convite (se houver) para refletir novo grupo
  UPDATE invitations
  SET team_id = _new_team_id,
      metadata = COALESCE(metadata, '{}'::jsonb) ||
                 jsonb_build_object('allowed_team_ids', jsonb_build_array(_new_team_id))
  WHERE accepted_by = _guest_id AND status = 'accepted';

  -- Activity feed
  PERFORM add_activity_feed(
    auth.uid(),
    'guest_transfer',
    'Convidado transferido de grupo',
    COALESCE((SELECT full_name FROM profiles WHERE id = _guest_id), 'Convidado') ||
      ' foi transferido para ' || COALESCE((SELECT name FROM teams WHERE id = _new_team_id), 'novo grupo'),
    _guest_id,
    '{}'::jsonb,
    _new_team_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'guest_id', _guest_id,
    'new_team_id', _new_team_id,
    'previous_team_id', current_team_id
  );
END;
$function$;

-- ---------- 5. RETROATIVO ----------

-- 5a. Aceitar convites pendentes cujo email bata com perfis já existentes
DO $$
DECLARE
  inv_record RECORD;
  matched_user_id UUID;
BEGIN
  FOR inv_record IN
    SELECT i.* FROM invitations i
    WHERE i.status = 'pending'
      AND i.email IS NOT NULL
      AND i.expires_at > now()
  LOOP
    SELECT id INTO matched_user_id
    FROM profiles
    WHERE lower(email) = lower(inv_record.email)
    LIMIT 1;

    IF matched_user_id IS NOT NULL THEN
      PERFORM accept_invitation(inv_record.code, matched_user_id);
    END IF;
  END LOOP;
END $$;

-- 5b. Para convidados aceitos sem team_members: usar metadata.allowed_team_ids ou primeiro grupo do inviter
DO $$
DECLARE
  inv_record RECORD;
  fallback_team_id UUID;
BEGIN
  FOR inv_record IN
    SELECT i.* FROM invitations i
    WHERE i.status = 'accepted'
      AND i.accepted_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = i.accepted_by)
  LOOP
    -- Tenta pegar primeiro team do metadata
    fallback_team_id := NULL;
    IF inv_record.metadata ? 'allowed_team_ids' THEN
      SELECT (jsonb_array_elements_text(inv_record.metadata->'allowed_team_ids'))::uuid
      INTO fallback_team_id
      LIMIT 1;
    END IF;

    -- Se não encontrou, usa team_id do convite
    IF fallback_team_id IS NULL THEN
      fallback_team_id := inv_record.team_id;
    END IF;

    -- Último fallback: primeiro grupo do inviter
    IF fallback_team_id IS NULL THEN
      SELECT tm.team_id INTO fallback_team_id
      FROM team_members tm
      WHERE tm.user_id = inv_record.invited_by
      ORDER BY tm.joined_at ASC
      LIMIT 1;
    END IF;

    IF fallback_team_id IS NOT NULL THEN
      INSERT INTO team_members (user_id, team_id, is_facilitator)
      VALUES (inv_record.accepted_by, fallback_team_id, false)
      ON CONFLICT DO NOTHING;

      -- Atualiza coluna team_id do convite
      UPDATE invitations
      SET team_id = fallback_team_id
      WHERE id = inv_record.id AND team_id IS NULL;
    END IF;
  END LOOP;
END $$;