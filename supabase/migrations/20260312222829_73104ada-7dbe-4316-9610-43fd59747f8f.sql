
-- Item 7: Add status column to referrals
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'morno';

-- Item 10: Add DELETE RLS policy for invitations (owner can delete pending invitations)
CREATE POLICY "Usuários podem deletar próprios convites pendentes"
ON public.invitations
FOR DELETE
TO authenticated
USING (auth.uid() = invited_by AND status = 'pending');

-- Item 10: Update expired invitations that are past their expiration date
UPDATE public.invitations
SET status = 'expired'
WHERE status = 'pending' AND expires_at < now();
