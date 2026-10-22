CREATE FUNCTION public.lp_validate_page() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR NEW.slug=ANY(ARRAY['auth','redefinir-senha','convite','instalar','m','p','membro','perfil','feed','membros','matchmaking','oportunidades','pedidos-indicacao','convidados','aniversarios','estatisticas','gente-em-acao','depoimentos','negocios','indicacoes','equipes','encontros','conteudos','ranking','convites','termos-de-uso','politica-de-privacidade','politica-de-cookies','conselho','changelog','documentacao','configuracoes','dashboard','admin','404','obrigado','lps']) THEN RAISE EXCEPTION 'Endereço reservado ou inválido'; END IF;
 IF NEW.template NOT IN ('blocks','community') THEN RAISE EXCEPTION 'Modelo inválido'; END IF;
 IF NEW.canonical_url IS NOT NULL AND NEW.canonical_url !~ '^https://gentenetworking\.com\.br(/|$)' AND NOT (NEW.slug='entrada-plataforma' AND NEW.canonical_url='https://comunidade.gentenetworking.com.br/auth') THEN RAISE EXCEPTION 'O domínio canônico das LPs deve ser gentenetworking.com.br'; END IF;
 IF NEW.slug='entrada-plataforma' AND NEW.template<>'blocks' THEN RAISE EXCEPTION 'Entrada da plataforma usa blocos'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lp_validate_page() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lp_validate_page BEFORE INSERT OR UPDATE ON public.landing_pages FOR EACH ROW EXECUTE FUNCTION public.lp_validate_page();
CREATE FUNCTION public.lp_duplicate_page(_source_id uuid,_slug text,_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE src public.landing_pages; new_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas Administradores'; END IF;
 SELECT * INTO src FROM public.landing_pages WHERE id=_source_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Página não encontrada'; END IF;
 INSERT INTO public.landing_pages(slug,name,is_active,template,meta_title,meta_description,whatsapp_group_link,event_date,redirect_when_expired,redirect_to_slug,primary_color,secondary_color,logo_url,logo_size,thank_you_title,thank_you_message,thank_you_redirect_delay,og_image_url,crm_team_id,crm_group_team_map,capture_source)
 VALUES(_slug,_name,false,src.template,src.meta_title,src.meta_description,src.whatsapp_group_link,src.event_date,src.redirect_when_expired,src.redirect_to_slug,src.primary_color,src.secondary_color,src.logo_url,src.logo_size,src.thank_you_title,src.thank_you_message,src.thank_you_redirect_delay,src.og_image_url,src.crm_team_id,src.crm_group_team_map,src.capture_source) RETURNING id INTO new_id;
 INSERT INTO public.page_blocks(landing_page_id,block_type,title,subtitle,content,image_url,button_text,button_link,background_color,text_color,font_size,title_color,title_font_size,subtitle_color,subtitle_font_size,content_color,content_font_size,order_index,is_visible,settings)
 SELECT new_id,block_type,title,subtitle,content,image_url,button_text,button_link,background_color,text_color,font_size,title_color,title_font_size,subtitle_color,subtitle_font_size,content_color,content_font_size,order_index,is_visible,settings FROM public.page_blocks WHERE landing_page_id=_source_id;
 INSERT INTO public.advanced_page_content(landing_page_id,content) SELECT new_id,content FROM public.advanced_page_content WHERE landing_page_id=_source_id;
 RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.lp_duplicate_page(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lp_duplicate_page(uuid,text,text) TO authenticated;
ALTER TABLE public.block_audit_logs ADD COLUMN changed_fields text[];
CREATE OR REPLACE FUNCTION public.lp_audit_block_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed text[];
BEGIN
 IF TG_OP='UPDATE' THEN SELECT array_agg(key) INTO changed FROM jsonb_each(to_jsonb(NEW)) WHERE value IS DISTINCT FROM to_jsonb(OLD)->key AND key<>'updated_at'; END IF;
 INSERT INTO public.block_audit_logs(block_id,landing_page_id,action,old_data,new_data,changed_by,changed_fields)
 VALUES(COALESCE(NEW.id,OLD.id),COALESCE(NEW.landing_page_id,OLD.landing_page_id),TG_OP,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END,auth.uid(),changed);
 RETURN COALESCE(NEW,OLD);
END $$;
DO $$ DECLARE pid uuid; BEGIN
 INSERT INTO public.landing_pages(slug,name,is_active,meta_title,meta_description,canonical_url,logo_url,capture_source)
 VALUES('entrada-plataforma','Entrada da plataforma',true,'Gente Networking — Conexões que geram negócios','Conheça a Comunidade, o Gente HUB e os Grupos Premium. Acesse sua plataforma Gente Networking.','https://comunidade.gentenetworking.com.br/auth','/logo-gente-card.png','lp_networking') RETURNING id INTO pid;
 INSERT INTO public.page_blocks(landing_page_id,block_type,title,subtitle,content,image_url,button_text,button_link,order_index) VALUES
 (pid,'hero','Gente Networking','Conectando pessoas, gerando negócios.',NULL,'/lp-entry-networking.png','Conheça o Gente','#ecossistema',0),
 (pid,'info','Um ecossistema de conexões','Relacionamentos que acompanham o seu negócio.','Conheça as diferentes formas de participar do Gente e encontre o caminho que faz sentido para você.',NULL,NULL,NULL,1),
 (pid,'info','Gente Comunidade','O primeiro passo para novas conexões.','Amplie sua rede, troque experiências e participe da Comunidade Gente.',NULL,'Conheça a Comunidade','https://lps.gentenetworking.com.br/comunidade',2),
 (pid,'info','Gente HUB','Encontros que aproximam pessoas.','Conheça o evento Gente HUB e as oportunidades de networking.',NULL,'Conheça o Gente HUB','https://lps.gentenetworking.com.br/gentehub',3),
 (pid,'info','Grupos Premium','Master, Conecte e Impulso.','Relacionamentos recorrentes para fortalecer conexões, indicações e oportunidades de negócios.',NULL,'Quero participar','https://lps.gentenetworking.com.br/participe',4),
 (pid,'info','Gente em Ação','Conexões que vão além do primeiro encontro.','Conversas individuais, indicações, depoimentos e negócios fazem parte da dinâmica do Gente.',NULL,NULL,NULL,5),
 (pid,'cta','Sua rede em um só lugar','Perfis, conexões e atividades na plataforma Gente.',NULL,NULL,'Acessar a plataforma','#login',6);
END $$;