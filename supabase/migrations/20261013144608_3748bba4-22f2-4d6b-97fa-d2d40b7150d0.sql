CREATE OR REPLACE FUNCTION public.sync_designated_facilitator_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid;
BEGIN
 IF TG_OP='INSERT' THEN
   IF NOT NEW.is_facilitator THEN RETURN NULL; END IF;
 ELSIF TG_OP='DELETE' THEN
   IF NOT OLD.is_facilitator THEN RETURN NULL; END IF;
 ELSE
   IF NEW.is_facilitator IS NOT DISTINCT FROM OLD.is_facilitator THEN RETURN NULL; END IF;
 END IF;
 target := CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END;
 IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=target AND role='admin') THEN RETURN NULL; END IF;
 IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id=target AND is_facilitator=true) THEN
   UPDATE public.user_roles SET role='facilitador' WHERE user_id=target AND role='membro';
 ELSE
   UPDATE public.user_roles SET role='membro' WHERE user_id=target AND role='facilitador';
 END IF;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_designated_facilitator_role() FROM PUBLIC,anon,authenticated;