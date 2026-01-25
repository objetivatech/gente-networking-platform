-- Migration: Fix security linter warnings - Using ALTER FUNCTION instead of DROP/CREATE

-- Update functions to set search_path using ALTER FUNCTION where possible
-- This avoids breaking dependent policies

-- For is_team_facilitator, we need to use CASCADE and recreate policies
-- First, save policy definitions by dropping and recreating

-- Drop dependent policies first
DROP POLICY IF EXISTS "Facilitadores podem adicionar convidados à sua equipe" ON public.team_members;
DROP POLICY IF EXISTS "Facilitadores podem remover membros da sua equipe" ON public.team_members;

-- Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS public.is_team_facilitator(uuid, uuid);

CREATE FUNCTION public.is_team_facilitator(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = p_user_id AND is_facilitator = true
  );
END;
$$;

-- Recreate the policies with the new function
CREATE POLICY "Facilitadores podem adicionar convidados à sua equipe"
ON public.team_members
FOR INSERT
WITH CHECK (
  public.is_team_facilitator(team_id, auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Facilitadores podem remover membros da sua equipe"
ON public.team_members
FOR DELETE
USING (
  public.is_team_facilitator(team_id, auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

-- Update get_user_teams
DROP FUNCTION IF EXISTS public.get_user_teams(uuid);
CREATE FUNCTION public.get_user_teams(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = p_user_id;
END;
$$;

-- Update are_same_team
DROP FUNCTION IF EXISTS public.are_same_team(uuid, uuid);
CREATE FUNCTION public.are_same_team(p_user_id1 uuid, p_user_id2 uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members tm1
    JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = p_user_id1 AND tm2.user_id = p_user_id2
  );
END;
$$;