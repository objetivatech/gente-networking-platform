REVOKE ALL ON FUNCTION public.sync_invitation_participation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_crm_attendance_v350() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_crm_lead_attendance_v350() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_crm_attendance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_guest_invitation(text,text,text,uuid,uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.renew_guest_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_guest_invitation(text,text,text,uuid,uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.renew_guest_invitation(uuid) TO authenticated, service_role;