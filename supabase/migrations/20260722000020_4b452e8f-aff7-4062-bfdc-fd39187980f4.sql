
CREATE POLICY "Admins can read contracts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contracts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only service role writes contracts"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Only service role updates contracts"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'contracts');

CREATE POLICY "Only service role deletes contracts"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'contracts');
