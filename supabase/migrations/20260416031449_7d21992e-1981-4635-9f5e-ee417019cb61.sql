-- Fix the ambiguous add_activity_feed call in handle_invitation_accepted
CREATE OR REPLACE FUNCTION public.handle_invitation_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inviter_name TEXT;
  new_member_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT full_name INTO inviter_name FROM profiles WHERE id = NEW.invited_by;
    SELECT full_name INTO new_member_name FROM profiles WHERE id = NEW.accepted_by;
    
    PERFORM add_activity_feed(
      NEW.invited_by, 'invitation',
      inviter_name || ' teve um convite aceito',
      'Novo membro: ' || COALESCE(new_member_name, 'Convidado'),
      NEW.id, '{}'::jsonb, NULL::uuid
    );
    
    PERFORM update_user_points_and_rank(NEW.invited_by);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Now fix pending invitations retroactively
DO $$
DECLARE
  inv RECORD;
  matched_profile_id UUID;
BEGIN
  FOR inv IN 
    SELECT i.id, i.code, i.email, i.invited_by, i.metadata
    FROM invitations i
    WHERE i.status = 'pending'
      AND i.email IS NOT NULL
  LOOP
    SELECT p.id INTO matched_profile_id
    FROM profiles p
    WHERE lower(trim(p.email)) = lower(trim(inv.email))
    LIMIT 1;
    
    IF matched_profile_id IS NOT NULL THEN
      UPDATE invitations
      SET status = 'accepted',
          accepted_by = matched_profile_id,
          accepted_at = now(),
          metadata = COALESCE(inv.metadata, '{}'::jsonb) || jsonb_build_object(
            'retroactive_fix', true,
            'fixed_at', now()::text
          )
      WHERE id = inv.id;
      
      INSERT INTO user_roles (user_id, role)
      VALUES (matched_profile_id, 'convidado'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Assign 'convidado' role to accepted invitees without any role
INSERT INTO user_roles (user_id, role)
SELECT DISTINCT i.accepted_by, 'convidado'::app_role
FROM invitations i
WHERE i.status = 'accepted'
  AND i.accepted_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = i.accepted_by
  )
ON CONFLICT (user_id, role) DO NOTHING;