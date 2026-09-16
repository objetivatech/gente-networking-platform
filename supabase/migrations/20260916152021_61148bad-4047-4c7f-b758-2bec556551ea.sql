REVOKE EXECUTE ON FUNCTION public.get_guest_journey_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_guest_journey_directory() TO authenticated, service_role;