-- Backfill de títulos vazios em encontros
UPDATE public.meetings
SET title = CASE WHEN event_type = 'hub_event' THEN 'Encontro Gente HUB' ELSE 'Encontro' END
WHERE title IS NULL OR btrim(title) = '';

-- Garantir título padrão em novos encontros
CREATE OR REPLACE FUNCTION public.meetings_default_title()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
    NEW.title := CASE WHEN NEW.event_type = 'hub_event' THEN 'Encontro Gente HUB' ELSE 'Encontro' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meetings_default_title_trg ON public.meetings;
CREATE TRIGGER meetings_default_title_trg
BEFORE INSERT OR UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.meetings_default_title();

-- Corrigir registros do feed que ficaram sem o nome do encontro
UPDATE public.activity_feed af
SET description = 'Encontro: ' || m.title
FROM public.meetings m
WHERE af.reference_id = m.id
  AND af.activity_type IN ('attendance', 'guest_attendance')
  AND (af.description IS NULL OR btrim(af.description) = '' OR btrim(af.description) = 'Encontro:');