-- Migration: Fix remaining security linter warnings
-- 1. Move extensions from public to extensions schema
-- 2. Fix remaining functions without search_path

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move unaccent extension to extensions schema
DROP EXTENSION IF EXISTS unaccent CASCADE;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;

-- Move pg_trgm extension to extensions schema
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate generate_slug function to use extensions schema
CREATE OR REPLACE FUNCTION public.generate_slug(name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  RETURN lower(regexp_replace(extensions.unaccent(name), '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$;

-- Recreate generate_unique_slug function with proper search_path
CREATE OR REPLACE FUNCTION public.generate_unique_slug(name text, user_id text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := public.generate_slug(name);
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug AND id != user_id::uuid) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;