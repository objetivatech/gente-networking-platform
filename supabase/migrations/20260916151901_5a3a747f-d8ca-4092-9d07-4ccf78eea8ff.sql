REVOKE ALL ON FUNCTION public.validate_crm_lead_onboarding() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_crm_lead_after_activation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_crm_guest_journey() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_crm_lead_onboarding() TO service_role;
GRANT EXECUTE ON FUNCTION public.link_crm_lead_after_activation() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_crm_guest_journey() TO service_role;