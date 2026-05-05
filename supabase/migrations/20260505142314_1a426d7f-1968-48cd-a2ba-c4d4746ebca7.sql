-- Função genérica: converte strings vazias em NULL para colunas opcionais (nullable)
CREATE OR REPLACE FUNCTION public.normalize_empty_strings_to_null()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  rec_json jsonb;
  nullable_cols text[];
  k text;
  v jsonb;
  changed boolean := false;
BEGIN
  -- Lista colunas nullable da tabela alvo
  SELECT array_agg(column_name::text) INTO nullable_cols
  FROM information_schema.columns
  WHERE table_schema = TG_TABLE_SCHEMA
    AND table_name = TG_TABLE_NAME
    AND is_nullable = 'YES';

  IF nullable_cols IS NULL THEN
    RETURN NEW;
  END IF;

  rec_json := to_jsonb(NEW);

  FOR k, v IN SELECT key, value FROM jsonb_each(rec_json) LOOP
    IF jsonb_typeof(v) = 'string'
       AND btrim(v #>> '{}') = ''
       AND k = ANY(nullable_cols) THEN
      rec_json := jsonb_set(rec_json, ARRAY[k], 'null'::jsonb, false);
      changed := true;
    END IF;
  END LOOP;

  IF changed THEN
    NEW := jsonb_populate_record(NEW, rec_json);
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger nas tabelas relevantes (BEFORE INSERT OR UPDATE)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles',
    'business_cases',
    'business_deals',
    'gente_em_acao',
    'referrals',
    'meetings',
    'council_posts',
    'council_replies',
    'contents',
    'invitations',
    'testimonials',
    'system_changelog',
    'teams'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_normalize_empty_strings ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_normalize_empty_strings
       BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.normalize_empty_strings_to_null()',
      t
    );
  END LOOP;
END $$;