
-- 1. Fix accept_invitation to assign 'convidado' role
CREATE OR REPLACE FUNCTION public.accept_invitation(_code character varying, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
BEGIN
  SELECT * INTO invitation_record
  FROM invitations
  WHERE code = _code AND status = 'pending' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;
  
  UPDATE invitations
  SET status = 'accepted', accepted_by = _user_id, accepted_at = now()
  WHERE id = invitation_record.id;
  
  -- Assign 'convidado' role if user has no role yet
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'convidado')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Add activity to feed
  PERFORM add_activity_feed(
    invitation_record.invited_by,
    'invitation',
    'Novo membro através de convite',
    'Convite aceito por ' || COALESCE((SELECT full_name FROM profiles WHERE id = _user_id), 'novo membro'),
    invitation_record.id
  );
  
  RETURN jsonb_build_object('success', true, 'invited_by', invitation_record.invited_by);
END;
$function$;

-- 2. Backfill: assign 'convidado' role to 17 profiles that accepted invitations but have no role
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'convidado'::app_role
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id)
AND EXISTS (SELECT 1 FROM invitations i WHERE i.accepted_by = p.id AND i.status = 'accepted');

-- 3. For the remaining 5 profiles without any role and no invitation, also assign 'convidado'
-- (they are test/direct-signup accounts that should at minimum have a role)
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'convidado'::app_role
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id);
