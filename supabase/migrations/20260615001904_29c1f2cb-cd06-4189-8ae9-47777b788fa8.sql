-- contents
DROP POLICY IF EXISTS "Conteúdos visíveis para autenticados" ON public.contents;
CREATE POLICY "Conteúdos visíveis para autenticados"
ON public.contents FOR SELECT TO authenticated USING (true);

-- system_changelog
DROP POLICY IF EXISTS "Changelog visível para autenticados" ON public.system_changelog;
CREATE POLICY "Changelog visível para autenticados"
ON public.system_changelog FOR SELECT TO authenticated USING (true);

-- monthly_points
DROP POLICY IF EXISTS "Pontos mensais visíveis para autenticados" ON public.monthly_points;
CREATE POLICY "Pontos mensais visíveis para autenticados"
ON public.monthly_points FOR SELECT TO authenticated USING (true);

-- realtime authorization: only authenticated users can subscribe/receive
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime"
ON realtime.messages FOR SELECT TO authenticated USING (true);