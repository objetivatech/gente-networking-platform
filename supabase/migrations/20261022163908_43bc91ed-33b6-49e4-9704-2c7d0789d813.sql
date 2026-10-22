CREATE OR REPLACE FUNCTION public.meeting_requests_notify_feed()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO v_name FROM profiles WHERE id = NEW.requester_id;
    PERFORM add_activity_feed(NEW.recipient_id, 'meeting_request', 'Nova solicitação de Gente em Ação',
      COALESCE(v_name,'Um membro') || ' quer agendar um 1x1 com você.', NEW.id,
      jsonb_build_object('meeting_request_id', NEW.id), NULL::uuid);
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('confirmed','declined') THEN
    SELECT full_name INTO v_name FROM profiles WHERE id = NEW.recipient_id;
    PERFORM add_activity_feed(NEW.requester_id, 'meeting_request',
      CASE WHEN NEW.status='confirmed' THEN 'Gente em Ação confirmado' ELSE 'Solicitação de Gente em Ação recusada' END,
      COALESCE(v_name,'O membro') || CASE WHEN NEW.status='confirmed' THEN ' confirmou' ELSE ' recusou' END || ' a solicitação.',
      NEW.id, jsonb_build_object('meeting_request_id', NEW.id, 'status', NEW.status), NULL::uuid);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'meeting_requests_notify_feed falhou: %', SQLERRM;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.meeting_requests_notify_feed() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS meeting_requests_notify_feed ON public.meeting_requests;
CREATE TRIGGER meeting_requests_notify_feed AFTER INSERT OR UPDATE OF status ON public.meeting_requests
  FOR EACH ROW EXECUTE FUNCTION public.meeting_requests_notify_feed();