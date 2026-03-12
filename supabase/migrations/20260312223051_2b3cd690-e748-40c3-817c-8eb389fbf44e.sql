
-- Allow recipients to update status of referrals sent to them
CREATE POLICY "Destinatários podem atualizar status da indicação"
ON public.referrals
FOR UPDATE
TO authenticated
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);
