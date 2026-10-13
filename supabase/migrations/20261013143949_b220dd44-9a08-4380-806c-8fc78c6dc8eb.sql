CREATE OR REPLACE FUNCTION public.sync_designated_facilitator_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
 target := CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END;
 IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=target AND role='admin') THEN RETURN NULL; END IF;
 IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id=target AND is_facilitator=true) THEN
   UPDATE public.user_roles SET role='facilitador' WHERE user_id=target AND role='membro';
 ELSE
   UPDATE public.user_roles SET role='membro' WHERE user_id=target AND role='facilitador';
 END IF;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_designated_facilitator_role() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_designated_facilitator_role AFTER INSERT OR UPDATE OF is_facilitator OR DELETE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.sync_designated_facilitator_role();
UPDATE public.user_roles r SET role='facilitador' WHERE r.role='membro' AND EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id=r.user_id AND tm.is_facilitator=true) AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id=r.user_id AND a.role='admin');
CREATE OR REPLACE FUNCTION public.get_statistics_snapshot(_scope text DEFAULT 'community', _team_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE viewer uuid := auth.uid(); ids uuid[]; tids uuid[]; result jsonb; managerial boolean;
BEGIN
 IF viewer IS NULL OR NOT public.is_active_user(viewer) THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE='42501'; END IF;
 IF _scope NOT IN ('personal','community','admin') THEN RAISE EXCEPTION 'Escopo inválido'; END IF;
 managerial := public.has_role(viewer,'admin') OR public.has_role(viewer,'facilitador');
 IF _scope='admin' AND NOT managerial THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE='42501'; END IF;
 SELECT coalesce(array_agg(t.id),'{}'::uuid[]) INTO tids FROM public.teams t WHERE (managerial OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id=t.id AND tm.user_id=viewer)) AND (_team_id IS NULL OR t.id=_team_id);
 IF _team_id IS NOT NULL AND NOT (_team_id=ANY(tids)) THEN RAISE EXCEPTION 'Grupo não autorizado' USING ERRCODE='42501'; END IF;
 IF _scope='personal' THEN ids := ARRAY[viewer];
 ELSE
 IF NOT managerial AND NOT public.has_role(viewer,'membro') THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE='42501'; END IF;
 SELECT coalesce(array_agg(p.id),'{}'::uuid[]) INTO ids FROM public.profiles p WHERE p.is_active AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=p.id AND r.role IN ('membro','facilitador')) AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=p.id AND r.role='admin') AND ((managerial AND _team_id IS NULL) OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id=p.id AND tm.team_id=ANY(tids)));
 END IF;
 SELECT jsonb_build_object(
 'profiles',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'company',p.company,'avatar_url',p.avatar_url,'rank',p.rank,'points',p.points)) FROM public.profiles p WHERE p.id=ANY(ids)),'[]'::jsonb),
 'teams',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'color',t.color)) FROM public.teams t WHERE t.id=ANY(tids)),'[]'::jsonb),
 'teamMembers',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',tm.user_id,'team_id',tm.team_id)) FROM public.team_members tm WHERE tm.user_id=ANY(ids) AND tm.team_id=ANY(tids)),'[]'::jsonb),
 'genteEmAcao',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g.id,'user_id',g.user_id,'meeting_date',g.meeting_date,'meeting_type',g.meeting_type)) FROM public.gente_em_acao g WHERE g.user_id=ANY(ids)),'[]'::jsonb),
 'deals',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'closed_by_user_id',d.closed_by_user_id,'referred_by_user_id',d.referred_by_user_id,'value',d.value,'deal_date',d.deal_date)) FROM public.business_deals d WHERE d.closed_by_user_id=ANY(ids) OR d.referred_by_user_id=ANY(ids)),'[]'::jsonb),
 'referrals',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'from_user_id',r.from_user_id,'to_user_id',r.to_user_id,'created_at',r.created_at)) FROM public.referrals r WHERE r.from_user_id=ANY(ids) OR r.to_user_id=ANY(ids)),'[]'::jsonb),
 'testimonials',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'from_user_id',r.from_user_id,'to_user_id',r.to_user_id,'created_at',r.created_at)) FROM public.testimonials r WHERE r.from_user_id=ANY(ids) OR r.to_user_id=ANY(ids)),'[]'::jsonb),
 'councilReplies',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'created_at',r.created_at)) FROM public.council_replies r WHERE r.user_id=ANY(ids)),'[]'::jsonb),
 'businessCases',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'created_at',r.created_at)) FROM public.business_cases r WHERE r.user_id=ANY(ids)),'[]'::jsonb),
 'attendances',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'user_id',a.user_id,'meeting_id',a.meeting_id)) FROM public.attendances a WHERE a.user_id=ANY(ids) AND (_scope='personal' OR EXISTS(SELECT 1 FROM public.meetings m WHERE m.id=a.meeting_id AND (m.team_id=ANY(tids) OR (managerial AND _team_id IS NULL))))),'[]'::jsonb),
 'meetings',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'team_id',m.team_id,'title',m.title,'meeting_date',m.meeting_date)) FROM public.meetings m WHERE m.team_id=ANY(tids) OR (_scope='personal' AND EXISTS(SELECT 1 FROM public.attendances a WHERE a.meeting_id=m.id AND a.user_id=viewer)) OR (managerial AND _team_id IS NULL)),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.get_statistics_snapshot(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_statistics_snapshot(text,uuid) TO authenticated;
INSERT INTO public.system_changelog(version,title,description,changes,category) SELECT '3.51.0','Precisão dos indicadores e modal WhatsApp','Contadores consolidados e mensagens contidas no agendamento.', '["Contagem consistente de perfis ativos e atividades por Grupo","Período aplicado às estatísticas pessoais","Indicações enviadas e recebidas contabilizadas separadamente","Designação de Facilitador sincronizada com o papel","Modal WhatsApp adaptável e mensagem editável"]'::jsonb,'fix' WHERE NOT EXISTS(SELECT 1 FROM public.system_changelog WHERE version='3.51.0');