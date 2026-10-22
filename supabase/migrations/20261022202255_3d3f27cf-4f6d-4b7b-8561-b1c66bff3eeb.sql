CREATE POLICY lp_storage_admin ON storage.objects FOR ALL TO authenticated USING(bucket_id='lps-media' AND public.has_role(auth.uid(),'admin')) WITH CHECK(bucket_id='lps-media' AND public.has_role(auth.uid(),'admin') AND (storage.extension(name)=ANY(ARRAY['jpg','jpeg','png','webp','gif','avif'])));
CREATE FUNCTION public.lp_validate_block() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.block_type NOT IN ('hero','countdown','cta','banner','info','form','testimonials','gallery','video','faq') THEN RAISE EXCEPTION 'Tipo de bloco inválido'; END IF;
 IF NEW.block_type='form' AND EXISTS(SELECT 1 FROM public.landing_pages WHERE id=NEW.landing_page_id AND slug='entrada-plataforma') THEN RAISE EXCEPTION 'Entrada da plataforma não oferece cadastro aberto'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.lp_validate_block() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lp_block_validate BEFORE INSERT OR UPDATE ON public.page_blocks FOR EACH ROW EXECUTE FUNCTION public.lp_validate_block();