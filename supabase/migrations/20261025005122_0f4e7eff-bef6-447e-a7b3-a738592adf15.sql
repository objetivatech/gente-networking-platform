REVOKE ALL ON FUNCTION public.validate_subscriber_interaction() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_user_entitlements(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_user_entitlements(uuid) TO authenticated;
COMMENT ON FUNCTION public.has_module_access(uuid,text) IS 'Intentionally authenticated: RLS permission predicate. Only returns permission boolean; checks active profile and plan.';
COMMENT ON FUNCTION public.admin_assign_person_plan(uuid,uuid,date,boolean,boolean,uuid,app_role) IS 'Intentionally authenticated RPC; active admin required internally, locked profile, explicit role conversion, no payment fabrication.';
COMMENT ON FUNCTION public.get_community_profile(uuid) IS 'Intentionally authenticated RPC; gated viewer plus active subscriber/guest target. No CRM, email, ranks or member data.';
COMMENT ON FUNCTION public.get_my_premium_invitations() IS 'Intentionally authenticated RPC; subscriber own invited/confirmed visits only, no member or attendance directory.';
COMMENT ON FUNCTION public.respond_premium_invitation(uuid,boolean) IS 'Intentionally authenticated RPC; active subscriber may confirm/cancel own invitation only; never records attendance.';