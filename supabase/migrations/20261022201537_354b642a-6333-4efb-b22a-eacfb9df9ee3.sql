CREATE TABLE public.landing_pages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, name text NOT NULL,
 is_active boolean NOT NULL DEFAULT false, template text NOT NULL DEFAULT 'blocks',
 meta_title text, meta_description text, whatsapp_group_link text, event_date timestamptz,
 redirect_when_expired boolean NOT NULL DEFAULT false, redirect_to_slug text,
 primary_color text DEFAULT '#F7941D', secondary_color text DEFAULT '#1E3A5F',
 logo_url text, logo_size text DEFAULT 'md', thank_you_title text DEFAULT 'Obrigado!',
 thank_you_message text DEFAULT 'Sua inscrição foi realizada com sucesso.', thank_you_redirect_delay integer DEFAULT 5,
 og_image_url text, canonical_url text, crm_team_id uuid, crm_group_team_map jsonb NOT NULL DEFAULT '{}',
 capture_source public.crm_lead_source NOT NULL DEFAULT 'lp_networking',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.landing_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT ALL ON public.landing_pages TO service_role;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY lps_published ON public.landing_pages FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY lps_admin ON public.landing_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.page_blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
 block_type text NOT NULL, title text, subtitle text, content text, image_url text, button_text text, button_link text,
 background_color text, text_color text, font_size text, title_color text, title_font_size text,
 subtitle_color text, subtitle_font_size text, content_color text, content_font_size text,
 order_index integer NOT NULL DEFAULT 0, is_visible boolean NOT NULL DEFAULT true, settings jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_blocks TO authenticated;
GRANT ALL ON public.page_blocks TO service_role;
ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_blocks_published ON public.page_blocks FOR SELECT TO anon, authenticated USING (is_visible AND EXISTS(SELECT 1 FROM public.landing_pages p WHERE p.id=landing_page_id AND p.is_active));
CREATE POLICY lp_blocks_admin ON public.page_blocks FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE INDEX lp_blocks_page_order ON public.page_blocks(landing_page_id,order_index);

CREATE TABLE public.advanced_page_content (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), landing_page_id uuid UNIQUE NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
 content jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advanced_page_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advanced_page_content TO authenticated;
GRANT ALL ON public.advanced_page_content TO service_role;
ALTER TABLE public.advanced_page_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_advanced_published ON public.advanced_page_content FOR SELECT TO anon, authenticated USING(EXISTS(SELECT 1 FROM public.landing_pages p WHERE p.id=landing_page_id AND p.is_active));
CREATE POLICY lp_advanced_admin ON public.advanced_page_content FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));

CREATE TABLE public.media_library (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), file_name text NOT NULL, file_url text NOT NULL, file_type text,
 file_size integer, alt_text text, uploaded_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_media_admin ON public.media_library FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));

CREATE TABLE public.block_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), block_id uuid, landing_page_id uuid,
 action text NOT NULL, old_data jsonb, new_data jsonb, changed_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.block_audit_logs TO authenticated;
GRANT ALL ON public.block_audit_logs TO service_role;
ALTER TABLE public.block_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_audit_admin ON public.block_audit_logs FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.lp_touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.lp_touch_updated_at() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lp_pages_updated BEFORE UPDATE ON public.landing_pages FOR EACH ROW EXECUTE FUNCTION public.lp_touch_updated_at();
CREATE TRIGGER lp_blocks_updated BEFORE UPDATE ON public.page_blocks FOR EACH ROW EXECUTE FUNCTION public.lp_touch_updated_at();
CREATE TRIGGER lp_advanced_updated BEFORE UPDATE ON public.advanced_page_content FOR EACH ROW EXECUTE FUNCTION public.lp_touch_updated_at();
CREATE TRIGGER lp_media_updated BEFORE UPDATE ON public.media_library FOR EACH ROW EXECUTE FUNCTION public.lp_touch_updated_at();
CREATE FUNCTION public.lp_audit_block_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.block_audit_logs(block_id,landing_page_id,action,old_data,new_data,changed_by)
 VALUES(COALESCE(NEW.id,OLD.id),COALESCE(NEW.landing_page_id,OLD.landing_page_id),TG_OP,
 CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
 CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END,auth.uid());
 RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.lp_audit_block_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lp_blocks_audit AFTER INSERT OR UPDATE OR DELETE ON public.page_blocks FOR EACH ROW EXECUTE FUNCTION public.lp_audit_block_change();