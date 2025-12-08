-- Permitir usuários deletarem própria presença
CREATE POLICY "Usuários podem deletar própria presença"
ON public.attendances
FOR DELETE
USING (auth.uid() = user_id);

-- Permitir facilitadores deletarem presenças de encontros da sua equipe
CREATE POLICY "Facilitadores podem gerenciar presenças da equipe"
ON public.attendances
FOR DELETE
USING (
  has_role(auth.uid(), 'facilitador'::app_role) AND 
  EXISTS (
    SELECT 1 FROM meetings m
    JOIN team_members tm ON tm.team_id = m.team_id
    WHERE m.id = meeting_id 
    AND tm.user_id = auth.uid() 
    AND tm.is_facilitator = true
  )
);