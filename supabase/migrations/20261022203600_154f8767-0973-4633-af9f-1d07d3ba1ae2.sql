CREATE OR REPLACE FUNCTION public.lp_validate_page() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
 IF NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR NEW.slug=ANY(ARRAY['auth','redefinir-senha','convite','instalar','m','p','membro','perfil','feed','membros','matchmaking','oportunidades','pedidos-indicacao','convidados','aniversarios','estatisticas','gente-em-acao','depoimentos','negocios','indicacoes','equipes','encontros','conteudos','ranking','convites','termos-de-uso','politica-de-privacidade','politica-de-cookies','conselho','changelog','documentacao','configuracoes','dashboard','admin','404','obrigado','lps']) THEN RAISE EXCEPTION 'Endereço reservado ou inválido'; END IF;
 IF NEW.template NOT IN ('blocks','community') THEN RAISE EXCEPTION 'Modelo inválido'; END IF;
 IF NEW.canonical_url IS NOT NULL AND NEW.canonical_url !~ '^https://gentenetworking\.com\.br(/|$)' AND NOT (NEW.slug='entrada-plataforma' AND NEW.canonical_url='https://comunidade.gentenetworking.com.br/auth') THEN RAISE EXCEPTION 'O domínio canônico das LPs deve ser gentenetworking.com.br'; END IF;
 IF NEW.slug='entrada-plataforma' AND NEW.template<>'community' THEN RAISE EXCEPTION 'Entrada da plataforma usa editor avançado'; END IF;
 RETURN NEW;
END $function$;
UPDATE public.landing_pages SET template='community' WHERE slug='entrada-plataforma';
INSERT INTO public.advanced_page_content(landing_page_id,content)
SELECT p.id,jsonb_build_object(
 'hero',coalesce((select jsonb_build_object('title',b.title,'subtitle',b.subtitle,'buttonText',b.button_text,'imageUrl',b.image_url) from public.page_blocks b where b.landing_page_id=p.id and b.block_type='hero' order by order_index limit 1),'{}'::jsonb),
 'ecosystem',jsonb_build_object('title','Um ecossistema de conexões','subtitle','Relacionamentos que acompanham o seu negócio.','steps',coalesce((select jsonb_agg(jsonb_build_object('title',b.title,'subtitle',b.subtitle,'description',b.content,'badge',coalesce(b.button_text,''),'buttonLink',coalesce(b.button_link,'')) order by b.order_index) from public.page_blocks b where b.landing_page_id=p.id and b.block_type='info'),'[]'::jsonb)))
FROM public.landing_pages p WHERE p.slug='entrada-plataforma'
ON CONFLICT(landing_page_id) DO NOTHING;