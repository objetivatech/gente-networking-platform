CREATE POLICY "Convidados podem ver convite aceito"
ON public.invitations
FOR SELECT
TO authenticated
USING (auth.uid() = accepted_by);