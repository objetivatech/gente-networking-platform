-- Atualizar a função que trata convites aceitos para enviar email
CREATE OR REPLACE FUNCTION public.handle_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_name TEXT;
  new_member_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT full_name INTO inviter_name FROM profiles WHERE id = NEW.invited_by;
    SELECT full_name INTO new_member_name FROM profiles WHERE id = NEW.accepted_by;
    
    -- Adicionar atividade
    PERFORM add_activity_feed(
      NEW.invited_by, 'invitation',
      inviter_name || ' teve um convite aceito',
      'Novo membro: ' || COALESCE(new_member_name, 'Convidado'),
      NEW.id
    );
    
    -- Atualizar pontos do convidador (bonus por trazer novo membro)
    PERFORM update_user_points_and_rank(NEW.invited_by);
    
    -- Notificar por email usando edge function
    -- Isso será chamado via edge function pelo frontend quando o convite for aceito
  END IF;
  
  RETURN NEW;
END;
$$;