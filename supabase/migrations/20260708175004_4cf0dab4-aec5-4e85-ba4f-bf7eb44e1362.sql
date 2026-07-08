-- Fix: referrals third-party contact info exposed to all authenticated members
DROP POLICY IF EXISTS "Indicações visíveis para autenticados" ON public.referrals;

CREATE POLICY "Indicações visíveis para envolvidos e admin"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  auth.uid() = from_user_id
  OR auth.uid() = to_user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix: invitations UPDATE policy missing WITH CHECK (field-level restriction)
DROP POLICY IF EXISTS "Usuários podem atualizar próprios convites" ON public.invitations;

CREATE POLICY "Usuários podem atualizar próprios convites"
ON public.invitations
FOR UPDATE
TO authenticated
USING (auth.uid() = invited_by)
WITH CHECK (
  auth.uid() = invited_by
  AND (status)::text = 'pending'
  AND accepted_by IS NULL
);