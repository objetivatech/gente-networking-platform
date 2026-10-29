CREATE TABLE public.matchmaking_taxonomies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 type text NOT NULL,
 label text NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.matchmaking_taxonomies TO authenticated;
GRANT ALL ON public.matchmaking_taxonomies TO service_role;
ALTER TABLE public.matchmaking_taxonomies ENABLE ROW LEVEL SECURITY;
CREATE POLICY taxonomy_read ON public.matchmaking_taxonomies FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY taxonomy_admin_insert ON public.matchmaking_taxonomies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND public.is_active_user(auth.uid()));
CREATE POLICY taxonomy_admin_update ON public.matchmaking_taxonomies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') AND public.is_active_user(auth.uid())) WITH CHECK (public.has_role(auth.uid(),'admin') AND public.is_active_user(auth.uid()));
CREATE UNIQUE INDEX matchmaking_taxonomies_label_unique ON public.matchmaking_taxonomies(type,lower(btrim(label)));
CREATE FUNCTION public.validate_matchmaking_taxonomy() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 NEW.label := btrim(NEW.label);
 IF NEW.type NOT IN ('decisor','setor') OR length(NEW.label) NOT BETWEEN 1 AND 160 OR NEW.sort_order < 0 THEN RAISE EXCEPTION 'Opção de conexão inválida'; END IF;
 NEW.updated_at := now(); RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION public.validate_matchmaking_taxonomy() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_matchmaking_taxonomy BEFORE INSERT OR UPDATE ON public.matchmaking_taxonomies FOR EACH ROW EXECUTE FUNCTION public.validate_matchmaking_taxonomy();
INSERT INTO public.matchmaking_taxonomies(type,label,sort_order) SELECT 'decisor', label, ord::integer FROM unnest(ARRAY[
'Sócios, Fundadores e CEOs','Proprietários e Gestores de PMEs','Diretores e Gerentes Financeiros / CFOs / Tesouraria','Gerentes de RH, DHO e Gestão de Pessoas','Compradores, Suprimentos e Procurement','Diretores Comerciais e de Vendas','Diretores e Gerentes de Marketing e Comunicação','Advogados e Gestores de Escritórios Jurídicos','Contadores e Gestores Contábeis','Médicos, Dentistas e Gestores de Clínicas/Hospitais','Engenheiros, Arquitetos e Gestores de Obras','Síndicos Profissionais e Administradoras de Condomínios','Produtores Rurais e Gestores do Agronegócio','Consumidores Finais (Pessoa Física / B2C)','Profissionais Liberais e Autônomos'
]) WITH ORDINALITY AS t(label,ord);
INSERT INTO public.matchmaking_taxonomies(type,label,sort_order) SELECT 'setor', label, ord::integer FROM unnest(ARRAY[
'Indústria e Manufatura','Construção Civil, Engenharia e Imobiliário','Arquitetura, Interiores e Decoração','Jurídico e Advocacia','Contábil, Fiscal e Tributário','Tecnologia da Informação, Software e Telecom','Marketing, Publicidade e Audiovisual','Saúde, Medicina e Clínicas Especializadas','Odontologia e Estética Avançada','Educação, Treinamentos, Escolas e Faculdades','Varejo, Comércio Local e Franquias','Gastronomia, Bares e Restaurantes','Logística, Transportes e Comércio Exterior','Financeiro, Crédito, Seguros e Investimentos','Agronegócio e Agroindústria','Eventos, Hotelaria e Turismo','Recursos Humanos e Segurança do Trabalho','Serviços Corporativos, Limpeza e Facilities'
]) WITH ORDINALITY AS t(label,ord);
ALTER TABLE public.profiles ADD COLUMN doors_open uuid[] NOT NULL DEFAULT '{}', ADD COLUMN doors_seek uuid[] NOT NULL DEFAULT '{}', ADD COLUMN doors_notes text, ADD COLUMN ai_pitch text;
CREATE FUNCTION public.validate_profile_connection_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE previous_open uuid[] := '{}'; previous_seek uuid[] := '{}'; BEGIN
 IF TG_OP='UPDATE' THEN previous_open:=OLD.doors_open; previous_seek:=OLD.doors_seek; END IF;
 NEW.doors_open:=ARRAY(SELECT DISTINCT x FROM unnest(coalesce(NEW.doors_open,'{}')) x WHERE x IS NOT NULL ORDER BY x);
 NEW.doors_seek:=ARRAY(SELECT DISTINCT x FROM unnest(coalesce(NEW.doors_seek,'{}')) x WHERE x IS NOT NULL ORDER BY x);
 IF EXISTS (SELECT 1 FROM unnest(NEW.doors_open) x WHERE NOT (x=ANY(previous_open)) AND NOT EXISTS (SELECT 1 FROM public.matchmaking_taxonomies t WHERE t.id=x AND t.is_active)) OR EXISTS (SELECT 1 FROM unnest(NEW.doors_seek) x WHERE NOT (x=ANY(previous_seek)) AND NOT EXISTS (SELECT 1 FROM public.matchmaking_taxonomies t WHERE t.id=x AND t.is_active)) THEN RAISE EXCEPTION 'Selecione somente opções de conexão ativas'; END IF;
 IF length(coalesce(NEW.doors_notes,'')) > 500 THEN RAISE EXCEPTION 'Observações: máximo de 500 caracteres'; END IF;
 IF TG_OP='UPDATE' AND NEW.ai_pitch IS DISTINCT FROM OLD.ai_pitch AND auth.uid() IS NOT NULL AND NOT public.has_module_access(auth.uid(),'ai_pitch_enabled') THEN RAISE EXCEPTION 'Pitch indisponível para este papel ou plano' USING ERRCODE='42501'; END IF;
 RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION public.validate_profile_connection_fields() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_profile_connection_fields BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_connection_fields();
CREATE FUNCTION public.get_profile_connection_doors(_ids uuid[]) RETURNS TABLE(id uuid,doors_open uuid[],doors_seek uuid[],doors_notes text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.doors_open,p.doors_seek,p.doors_notes FROM public.profiles p WHERE auth.uid() IS NOT NULL AND p.id=ANY(_ids[1:2000]) AND (
 p.id=auth.uid() OR (public.is_active_user(auth.uid()) AND p.is_active AND (
 (public.is_community_member(auth.uid()) AND NOT public.has_role(p.id,'admin')) OR
 ((public.has_module_access(auth.uid(),'can_access_community_showcase') OR public.has_module_access(auth.uid(),'matchmaking_enabled')) AND public.is_showcase_profile(p.id))
 )));
$$;
REVOKE EXECUTE ON FUNCTION public.get_profile_connection_doors(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_profile_connection_doors(uuid[]) TO authenticated,service_role;
INSERT INTO public.system_changelog(version,title,description,category,changes) VALUES ('3.57.0','Portas de conexão e pitch salvo','Portas que abro e procuro com opções geridas pelo Admin, selos discretos e pontes de indicação no MatchMaking. Pitch permanece salvo no perfil.','feature','["15 decisores e 18 setores editáveis pelo Admin; inativação preserva seleções", "Perfil com portas oferecidas/procuradas e observações opcionais", "Cards com até 2 selos e contador; detalhes completos", "Compatibilidade de pontes sem alterar franquias, pontos ou completude", "Pitch salvo, geração explícita e edição manual", "Documentação e testes de regras atualizados"]'::jsonb);