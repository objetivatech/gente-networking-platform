-- Adicionar política para facilitadores poderem registrar presença de membros da equipe
CREATE POLICY "Facilitadores podem registrar presença da equipe"
ON public.attendances
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  (
    has_role(auth.uid(), 'facilitador'::app_role) 
    AND EXISTS (
      SELECT 1 
      FROM meetings m
      JOIN team_members tm ON tm.team_id = m.team_id
      WHERE m.id = meeting_id 
        AND tm.user_id = auth.uid() 
        AND tm.is_facilitator = true
    )
  )
);

-- Adicionar política para facilitadores poderem atualizar presença da equipe (caso necessário)
CREATE POLICY "Facilitadores podem atualizar presença da equipe"
ON public.attendances
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  (
    has_role(auth.uid(), 'facilitador'::app_role) 
    AND EXISTS (
      SELECT 1 
      FROM meetings m
      JOIN team_members tm ON tm.team_id = m.team_id
      WHERE m.id = attendances.meeting_id 
        AND tm.user_id = auth.uid() 
        AND tm.is_facilitator = true
    )
  )
);