CREATE OR REPLACE FUNCTION public.get_public_invitation_groups(_slug text)
RETURNS TABLE(id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT t.id,t.name FROM teams t JOIN team_members tm ON tm.team_id=t.id
 JOIN profiles p ON p.id=tm.user_id
 WHERE p.slug=_slug AND p.is_active AND p.public_profile_enabled
 AND has_module_access(p.id,'public_profile_enabled')
 AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=p.id AND r.role IN ('membro','facilitador','admin'))
 ORDER BY tm.joined_at,t.name;
$$;
REVOKE ALL ON FUNCTION public.get_public_invitation_groups(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_invitation_groups(text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.submit_public_profile_invitation(_slug text,_team_id uuid,_name text,_email text,_phone text,_company text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE host profiles%ROWTYPE; lead crm_leads%ROWTYPE; inv invitations%ROWTYPE; email_value text:=lower(btrim(_email)); digits text:=right(regexp_replace(coalesce(_phone,''),'\D','','g'),11); profile_id_value uuid; original_author uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT p.* INTO host FROM profiles p WHERE p.slug=_slug AND p.is_active AND p.public_profile_enabled AND has_module_access(p.id,'public_profile_enabled') AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=p.id AND r.role IN ('membro','facilitador','admin'));
 IF host.id IS NULL OR NOT EXISTS(SELECT 1 FROM team_members WHERE user_id=host.id AND team_id=_team_id) THEN RETURN jsonb_build_object('ok',false,'error','profile_or_group_unavailable'); END IF;
 IF length(btrim(_name))<2 OR length(_name)>120 OR email_value IS NULL OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[A-Za-z]{2,}$' OR length(email_value)>200 OR length(digits) NOT IN (10,11) THEN RETURN jsonb_build_object('ok',false,'error','invalid_payload'); END IF;
 -- Global transaction lock for public acquisitions protects shared telephone/email identities.
 PERFORM pg_advisory_xact_lock(hashtextextended('public_profile_intake',0));
 SELECT p.id INTO profile_id_value FROM profiles p WHERE p.is_active AND (lower(p.email)=email_value OR p.phone_digits=digits) ORDER BY p.created_at LIMIT 1;
 IF profile_id_value IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','existing_account'); END IF;
 SELECT l.* INTO lead FROM crm_leads l WHERE archived_at IS NULL AND (lower(email)=email_value OR phone_digits=digits) ORDER BY created_at LIMIT 1;
 IF lead.profile_id IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','existing_account'); END IF;
 IF lead.invitation_id IS NOT NULL THEN SELECT * INTO inv FROM invitations WHERE id=lead.invitation_id; END IF;
 IF inv.status='accepted' THEN RETURN jsonb_build_object('ok',false,'error','existing_account'); END IF;
 original_author:=coalesce(inv.invited_by,lead.invited_by,host.id);
 IF inv.id IS NULL THEN
 SELECT * INTO inv FROM invitations WHERE lower(email)=email_value AND status='pending' AND expires_at>now() ORDER BY created_at LIMIT 1;
 original_author:=coalesce(inv.invited_by,original_author);
 END IF;
 IF inv.id IS NULL OR inv.status<>'pending' OR inv.expires_at<=now() THEN
 IF (SELECT count(*) FROM invitations WHERE invited_by=host.id AND created_at>now()-interval '10 minutes' AND metadata->>'source_detail'='perfil_publico_membro')>=20 THEN RETURN jsonb_build_object('ok',false,'error','rate_limited'); END IF;
 INSERT INTO invitations(code,invited_by,email,name,team_id,invite_target,invite_purpose,renewal_of_id,metadata)
 VALUES(upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),original_author,email_value,btrim(_name),coalesce(inv.team_id,_team_id),'comunidade','premium_group',inv.id,jsonb_build_object('source','convite_membro','source_detail','perfil_publico_membro','profile_slug',host.slug,'requested_host_id',host.id)) RETURNING * INTO inv;
 END IF;
 IF lead.id IS NULL THEN
 INSERT INTO crm_leads(name,email,phone,company,source,source_detail,status,invited_by,invitation_id,target_team_id,onboarding_category,onboarding_status,metadata)
 VALUES(btrim(_name),email_value,_phone,nullif(btrim(_company),''),'convite_membro','perfil_publico_membro','novo',inv.invited_by,inv.id,inv.team_id,'comunidade','cadastro_recebido',jsonb_build_object('profile_slug',host.slug,'requested_host_id',host.id,'requested_team_id',_team_id,'page_url','https://comunidade.gentenetworking.com.br/m/'||host.slug)) RETURNING * INTO lead;
 ELSE
 UPDATE crm_leads SET invitation_id=inv.id,invited_by=coalesce(lead.invited_by,inv.invited_by),target_team_id=coalesce(lead.target_team_id,inv.team_id),metadata=coalesce(lead.metadata,'{}')||jsonb_build_object('last_public_profile_request',jsonb_build_object('profile_slug',host.slug,'host_id',host.id,'team_id',_team_id,'at',now()),'alt_emails',CASE WHEN lower(lead.email)<>email_value THEN coalesce(lead.metadata->'alt_emails','[]'::jsonb)||jsonb_build_array(email_value) ELSE coalesce(lead.metadata->'alt_emails','[]'::jsonb) END),updated_at=now() WHERE id=lead.id RETURNING * INTO lead;
 END IF;
 RETURN jsonb_build_object('ok',true,'lead_id',lead.id,'invitation_id',inv.id,'invitation_code',inv.code,'team_id',inv.team_id,'host_id',host.id,'notify_host',inv.invited_by=host.id,'activation_needed',lead.onboarding_email_status IS DISTINCT FROM 'sent','name',lead.name,'email',lead.email,'phone',lead.phone,'company',lead.company);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_public_profile_invitation(text,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_profile_invitation(text,uuid,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_community_message(_context text,_reference_id uuid) RETURNS boolean LANGUAGE plpgsql SET search_path=public AS $$ DECLARE claimed boolean; BEGIN IF _context NOT IN ('community_plan','community_premium','community_request','community_response','lp_activation','lp_admin_notice','lp_rd_conversion','public_profile_host_notice') THEN RETURN false; END IF; INSERT INTO public.community_message_claims(context,reference_id) VALUES(_context,_reference_id) ON CONFLICT(context,reference_id) DO UPDATE SET state='sending',claimed_at=now(),updated_at=now() WHERE community_message_claims.state='failed' OR (community_message_claims.state='sending' AND community_message_claims.claimed_at<now()-interval '10 minutes') RETURNING true INTO claimed; RETURN coalesce(claimed,false); END $$;
REVOKE ALL ON FUNCTION public.claim_community_message(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_community_message(text,uuid) TO service_role;

INSERT INTO system_changelog(version,title,description,category,changes) VALUES('3.62.0','Convites pelo perfil público','Visitantes podem conhecer um Grupo pelo perfil público, com autoria preservada e ativação pelo fluxo existente.','feature','[{"type":"feature","description":"Formulário de convite nos perfis públicos com escolha dos Grupos do anfitrião."},{"type":"security","description":"Origem e convidador resolvidos no servidor; contatos e convites anteriores preservados; nenhum ponto por inscrição."},{"type":"feature","description":"E-mail de ativação e aviso ao anfitrião com proteção contra repetição."},{"type":"documentation","description":"Manuais técnicos, fluxos, documentação interna e roteiro atualizados."}]'::jsonb);