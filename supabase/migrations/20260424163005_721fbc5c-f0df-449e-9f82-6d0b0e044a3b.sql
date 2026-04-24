-- 1. Remover convidados de team_members (eles não pertencem a grupos)
DELETE FROM public.team_members tm
USING public.user_roles ur
WHERE tm.user_id = ur.user_id
  AND ur.role = 'convidado'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = tm.user_id
      AND ur2.role IN ('membro','admin','facilitador')
  );

-- 2. Atualizar accept_invitation para NÃO inserir convidados em team_members
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

  -- Marcar convite como aceito (snapshot do grupo permitido em metadata)
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

  -- IMPORTANTE: convidados NÃO são inseridos em team_members.
  -- A vinculação ao grupo do inviter é feita exclusivamente via invitations.team_id
  -- e metadata.allowed_team_ids. Só ao serem promovidos a membro entram em team_members.

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

-- 3. Atualizar transfer_guest_to_team para operar apenas via invitation
CREATE OR REPLACE FUNCTION public.transfer_guest_to_team(_guest_id uuid, _new_team_id uuid)
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

  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = _new_team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Grupo destino inexistente');
  END IF;

  -- Grupo atual do convidado vem do convite aceito
  SELECT team_id INTO current_team_id
  FROM invitations
  WHERE accepted_by = _guest_id AND status = 'accepted'
  ORDER BY accepted_at DESC NULLS LAST
  LIMIT 1;

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

  -- Garantir que convidado NÃO está em team_members (segurança)
  DELETE FROM team_members WHERE user_id = _guest_id;

  -- Atualizar convite com novo grupo (e snapshot)
  UPDATE invitations
  SET team_id = _new_team_id,
      metadata = COALESCE(metadata, '{}'::jsonb) ||
                 jsonb_build_object('allowed_team_ids', jsonb_build_array(_new_team_id))
  WHERE accepted_by = _guest_id AND status = 'accepted';

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

-- 4. Remover policy que permitia facilitadores adicionarem convidados em team_members
DROP POLICY IF EXISTS "Facilitadores podem adicionar convidados à sua equipe" ON public.team_members;

-- 5. Registrar v3.7.0 no changelog
INSERT INTO public.system_changelog (version, title, description, category, changes)
VALUES (
  'v3.7.0',
  'Convidados separados de Membros',
  'Convidados agora são totalmente separados dos grupos no banco e na UI. Eles não fazem parte de team_members; o vínculo com um grupo existe apenas via convite. A UI passa a mostrar três seções claras (Facilitadores, Membros, Convidados) em todas as páginas relevantes.',
  'feature',
  '[
    "DELETE de convidados em team_members (eles não pertencem a grupos)",
    "accept_invitation não insere mais convidados em team_members",
    "transfer_guest_to_team agora opera apenas via invitations.team_id",
    "Aba Convidados em /encontros mostra apenas convidados ativos (role atual = convidado)",
    "Aba Grupos em /membros mostra apenas Membros e Facilitadores",
    "Card de grupo em /admin (Gestão do Grupo do Facilitador) com 3 seções separadas",
    "Removida policy de INSERT que permitia facilitadores adicionarem convidados em team_members"
  ]'::jsonb
);
