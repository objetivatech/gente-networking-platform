CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _feature text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE f jsonb; audience text; internal boolean; subscriber boolean; history boolean;
BEGIN
IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user_id AND is_active) THEN RETURN false; END IF;
IF _feature='can_access_community_showcase' AND public.has_role(_user_id,'admin') THEN RETURN true; END IF;
internal:=public.has_role(_user_id,'membro') OR public.has_role(_user_id,'facilitador'); subscriber:=public.is_subscriber(_user_id);
SELECT p.features,p.audience INTO f,audience FROM public.billing_subscriptions s JOIN public.billing_plans p ON p.id=s.plan_id WHERE s.profile_id=_user_id AND s.status='active' AND s.start_date<=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND p.active AND (NOT subscriber OR p.audience='assinante') ORDER BY s.start_date DESC,s.created_at DESC,s.id LIMIT 1;
IF _feature IN ('public_profile_enabled','ai_pitch_enabled') THEN RETURN internal AND audience IN ('premium','membro') AND coalesce((f->>_feature)::boolean,false); END IF;
IF _feature IN ('can_access_council','can_access_opportunities','can_access_referral_requests') AND NOT internal AND NOT public.has_role(_user_id,'admin') THEN RETURN false; END IF;
IF public.has_role(_user_id,'admin') THEN RETURN true; END IF;
IF public.has_role(_user_id,'convidado') AND NOT internal AND NOT subscriber THEN RETURN false; END IF;
IF NOT internal AND NOT subscriber THEN RETURN false; END IF;
IF _feature='can_access_community_showcase' AND internal THEN RETURN coalesce((f->>_feature)::boolean,false); END IF;
history:=EXISTS(SELECT 1 FROM public.billing_subscriptions WHERE profile_id=_user_id);
IF f IS NULL THEN RETURN internal AND NOT history; END IF;
IF f ? _feature THEN RETURN (f->>_feature)::boolean; END IF;
IF _feature='matchmaking_enabled' THEN RETURN internal OR coalesce((f->>'matchmaking_monthly_quota')::integer,0)>0; END IF;
IF internal THEN RETURN true; END IF;
RETURN _feature IN ('can_access_community_showcase','can_access_referrals','can_access_business_deals','can_access_testimonials','can_access_feed','can_access_contents');
END $$;
REVOKE ALL ON FUNCTION public.has_module_access(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_module_access(uuid,text) TO authenticated,service_role;

INSERT INTO public.landing_pages(slug,name,template,is_active,meta_title,meta_description,capture_source,canonical_url)
VALUES('assinantes','Assinantes da Comunidade','community',true,'Assinantes da Comunidade — Gente Networking','Conheça a Vitrine, as conexões e os recursos por plano da assinatura da Comunidade Gente. Seu próximo passo: os Grupos Premium.','lp_networking','https://gentenetworking.com.br/assinantes')
ON CONFLICT(slug) DO NOTHING;
INSERT INTO public.advanced_page_content(landing_page_id,content)
SELECT id,'{}'::jsonb FROM public.landing_pages WHERE slug='assinantes'
ON CONFLICT(landing_page_id) DO NOTHING;

UPDATE public.advanced_page_content SET content=content || '{"hero":{"title":"Gente Networking","subtitle":"Pessoas que se conhecem. Relações que crescem. Negócios que acontecem.","buttonText":"Conheça o ecossistema","imageUrl":"/lp-entry-networking.png","highlights":["Comunidade","Conexões individuais","Grupos Premium"]},"ecosystem":{"title":"Encontre o seu lugar no Gente.","subtitle":"Do primeiro contato às conexões recorrentes: diferentes formas de participar, um mesmo propósito.","steps":[{"title":"Comunidade","subtitle":"Comece a se conectar.","description":"Conheça o Gente, amplie sua rede e participe das trocas da comunidade.","badge":"Conhecer a Comunidade","buttonLink":"https://lps.gentenetworking.com.br/comunidade","icon":"users"},{"title":"Assinante da Comunidade","subtitle":"Transforme contatos em conexões.","description":"Acesse a Vitrine de Assinantes e Convidados ativos e os recursos liberados pelo seu plano.","badge":"Conhecer a assinatura","buttonLink":"/assinantes","icon":"network"},{"title":"Gente HUB","subtitle":"Esteja onde as conexões acontecem.","description":"Conheça os encontros do Gente HUB e novas oportunidades de networking.","badge":"Conhecer o Gente HUB","buttonLink":"https://lps.gentenetworking.com.br/gentehub","icon":"calendar"},{"title":"Grupos Premium","subtitle":"Aprofunde seus relacionamentos.","description":"Master, Conecte, Impulso e outros Grupos: uma próxima etapa para conexões e oportunidades recorrentes.","badge":"Conhecer os Grupos","buttonLink":"https://lps.gentenetworking.com.br/participe","icon":"crown"}]}}'::jsonb,updated_at=now()
WHERE landing_page_id=(SELECT id FROM public.landing_pages WHERE slug='entrada-plataforma');