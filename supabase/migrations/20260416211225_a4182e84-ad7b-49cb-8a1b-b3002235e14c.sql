-- 1. Limpar role 'convidado' do Andre Luis (já é membro)
DELETE FROM public.user_roles
WHERE user_id = '12caa52e-bd0a-4662-a611-5362ac36914a'
  AND role = 'convidado'::app_role;

-- 2. Limpeza defensiva: para qualquer usuário que tenha role 'convidado' E uma role superior,
-- remover a 'convidado' (a role superior prevalece)
DELETE FROM public.user_roles ur
WHERE ur.role = 'convidado'::app_role
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id
      AND ur2.role IN ('admin'::app_role, 'facilitador'::app_role, 'membro'::app_role)
  );

-- 3. Reforçar a função promote_guest_to_member para SEMPRE limpar roles antigas
CREATE OR REPLACE FUNCTION public.promote_guest_to_member(_guest_id uuid, _target_role app_role DEFAULT 'membro'::app_role, _team_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role app_role;
  guest_current_role app_role;
  caller_is_facilitator_of_team BOOLEAN := false;
BEGIN
  SELECT role INTO caller_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'facilitador') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para promover usuários');
  END IF;
  
  IF caller_role = 'facilitador' THEN
    IF _target_role != 'membro' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Facilitadores só podem promover para Membro');
    END IF;
    
    IF _team_id IS NULL THEN
      SELECT team_id INTO _team_id FROM team_members 
      WHERE user_id = auth.uid() AND is_facilitator = true LIMIT 1;
    END IF;
    
    IF _team_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM team_members 
        WHERE user_id = auth.uid() AND team_id = _team_id AND is_facilitator = true
      ) INTO caller_is_facilitator_of_team;
      
      IF NOT caller_is_facilitator_of_team THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você só pode promover convidados no seu grupo');
      END IF;
    END IF;
  END IF;
  
  SELECT role INTO guest_current_role FROM user_roles WHERE user_id = _guest_id LIMIT 1;
  
  -- Bloquear apenas se já tem role IGUAL OU SUPERIOR ao alvo
  IF guest_current_role IS NOT NULL 
     AND guest_current_role NOT IN ('convidado') 
     AND guest_current_role = _target_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este usuário já possui o perfil ' || guest_current_role::text);
  END IF;
  
  -- CORREÇÃO: limpar TODAS as roles antigas do usuário (não só 'convidado')
  -- antes de inserir a nova, garantindo unicidade lógica
  DELETE FROM user_roles WHERE user_id = _guest_id AND role != _target_role;
  
  -- Inserir nova role
  INSERT INTO user_roles (user_id, role)
  VALUES (_guest_id, _target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  IF _team_id IS NOT NULL THEN
    INSERT INTO team_members (user_id, team_id, is_facilitator)
    VALUES (_guest_id, _team_id, _target_role = 'facilitador')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'user_id', _guest_id, 
    'new_role', _target_role::text,
    'team_id', _team_id
  );
END;
$function$;

-- 4. Adicionar constraint UNIQUE para impedir múltiplas roles por usuário (defesa em profundidade)
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);