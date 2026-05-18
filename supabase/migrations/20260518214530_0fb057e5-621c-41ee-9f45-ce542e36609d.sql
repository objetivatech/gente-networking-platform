-- Bucket dedicado para fotos do Gente em Ação
INSERT INTO storage.buckets (id, name, public)
VALUES ('gente-em-acao', 'gente-em-acao', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública
CREATE POLICY "Gente em Acao images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'gente-em-acao');

-- Upload: apenas na própria pasta {user_id}/...
CREATE POLICY "Users can upload their own gente-em-acao image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gente-em-acao'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own gente-em-acao image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gente-em-acao'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own gente-em-acao image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gente-em-acao'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);