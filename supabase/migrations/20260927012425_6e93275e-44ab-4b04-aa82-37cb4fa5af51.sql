CREATE OR REPLACE FUNCTION public.deactivate_member(_member_id uuid, _reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  previous_role app_role;
  previous_team_id uuid;
  teams_removed integer := 0;
  member_name text;
  member_email text;
  lead_id uuid;
  v_source_detail text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem desativar pessoas');
  END IF;
  SELECT role INTO previous_role FROM user_roles WHERE user_id=_member_id LIMIT 1;
  IF previous_role IS NULL THEN RETURN jsonb_build_object('success',false,'error','Papel atual não encontrado'); END IF;
  IF previous_role='admin' THEN RETURN jsonb_build_object('success',false,'error','Não é possível desativar um administrador'); END IF;
  SELECT full_name,email INTO member_name,member_email FROM profiles WHERE id=_member_id;
  IF member_name IS NULL THEN RETURN jsonb_build_object('success',false,'error','Pessoa não encontrada'); END IF;
  SELECT team_id INTO previous_team_id FROM team_members WHERE user_id=_member_id ORDER BY joined_at LIMIT 1;
  DELETE FROM team_members WHERE user_id=_member_id;
  GET DIAGNOSTICS teams_removed=ROW_COUNT;
  DELETE FROM user_roles WHERE user_id=_member_id;
  INSERT INTO user_roles(user_id,role) VALUES(_member_id,'convidado') ON CONFLICT DO NOTHING;
  UPDATE profiles SET is_active=false,deactivated_at=now(),deactivation_reason=_reason,public_profile_enabled=false WHERE id=_member_id;
  UPDATE monthly_points SET points=0,updated_at=now() WHERE user_id=_member_id AND year_month=get_current_year_month();
  UPDATE guest_participations SET status='cancelled',cancelled_at=now(),metadata=metadata||jsonb_build_object('cancel_reason','profile_deactivated')
    WHERE profile_id=_member_id AND status IN ('invited','confirmed');
  SELECT id INTO lead_id FROM crm_leads WHERE profile_id=_member_id AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF lead_id IS NULL AND member_email IS NOT NULL THEN
    SELECT id INTO lead_id FROM crm_leads WHERE lower(email)=lower(member_email) AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  END IF;
  v_source_detail:=CASE WHEN previous_role='convidado' THEN 'ex_convidado' ELSE 'ex_membro' END;
  IF lead_id IS NULL THEN
    INSERT INTO crm_leads(name,email,source,source_detail,status,profile_id,target_team_id,notes,previous_role,metadata)
    VALUES(COALESCE(member_name,'Pessoa desativada'),COALESCE(member_email,_member_id::text||'@sem-email.local'),'convite_manual',v_source_detail,'perdido',_member_id,previous_team_id,_reason,previous_role,
      jsonb_build_object('ex_membro',previous_role<>'convidado','deactivated_at',now(),'previous_role',previous_role::text)) RETURNING id INTO lead_id;
  ELSE
    UPDATE crm_leads SET profile_id=_member_id,status='perdido',source_detail=v_source_detail,previous_role=previous_role,
      metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('ex_membro',previous_role<>'convidado','deactivated_at',now(),'previous_role',previous_role::text),updated_at=now()
    WHERE id=lead_id;
  END IF;
  INSERT INTO crm_lead_history(lead_id,from_status,to_status,moved_by,reason,event_type,metadata)
  VALUES(lead_id,NULL,'perdido',auth.uid(),_reason,'member_deactivated',jsonb_build_object('previous_role',previous_role::text,'previous_team_id',previous_team_id));
  BEGIN
    PERFORM add_activity_feed(_member_id,'member_deactivated','Pessoa desativada',COALESCE(_reason,'Acesso desativado'),_member_id,
      jsonb_build_object('previous_role',previous_role::text,'previous_team_id',previous_team_id),previous_team_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('success',true,'member_id',_member_id,'teams_removed',teams_removed,'previous_role',previous_role,'lead_id',lead_id,'rescue_audience',v_source_detail);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_member(_member_id uuid,_team_id uuid DEFAULT NULL,_role app_role DEFAULT 'membro')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lead_id uuid;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RETURN jsonb_build_object('success',false,'error','Apenas administradores podem reativar pessoas'); END IF;
  IF _role NOT IN ('membro','facilitador','convidado') THEN RETURN jsonb_build_object('success',false,'error','Papel de retorno inválido'); END IF;
  IF _role IN ('membro','facilitador') AND _team_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Selecione o Grupo de retorno'); END IF;
  UPDATE profiles SET is_active=true,deactivated_at=NULL,deactivation_reason=NULL WHERE id=_member_id;
  DELETE FROM user_roles WHERE user_id=_member_id;
  INSERT INTO user_roles(user_id,role) VALUES(_member_id,_role);
  IF _team_id IS NOT NULL THEN INSERT INTO team_members(team_id,user_id,is_facilitator) VALUES(_team_id,_member_id,_role='facilitador') ON CONFLICT DO NOTHING; END IF;
  UPDATE rescue_dispatches SET status='cancelled',cancel_reason='convertido' WHERE profile_id=_member_id AND status='queued';
  SELECT id INTO lead_id FROM crm_leads WHERE profile_id=_member_id AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF lead_id IS NOT NULL THEN
    UPDATE crm_leads SET status='fechado',previous_role=NULL,updated_at=now() WHERE id=lead_id;
    INSERT INTO crm_lead_history(lead_id,from_status,to_status,moved_by,reason,event_type,metadata)
    VALUES(lead_id,'perdido','fechado',auth.uid(),'Pessoa reativada','member_reactivated',jsonb_build_object('team_id',_team_id,'role',_role::text));
  END IF;
  RETURN jsonb_build_object('success',true,'member_id',_member_id,'team_id',_team_id,'role',_role);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END;
$$;