ALTER FUNCTION public.register_meeting_request_whatsapp_open(UUID) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.register_meeting_request_whatsapp_open(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_meeting_request_whatsapp_open(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_meeting_request_whatsapp_open(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_meeting_request_whatsapp_open(UUID) TO service_role;