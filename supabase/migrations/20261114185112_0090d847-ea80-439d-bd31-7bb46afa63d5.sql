-- @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte
CREATE OR REPLACE FUNCTION public.get_pending_connection_checkouts(_offset integer DEFAULT 0, _limit integer DEFAULT 25) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao Admin' USING ERRCODE='42501'; END IF;
 IF _offset < 0 OR _limit < 1 OR _limit > 100 THEN RAISE EXCEPTION 'Paginação inválida'; END IF;
 WITH eligible AS (
 SELECT c.id,c.profile_id,c.created_at,p.full_name,p.phone,b.name AS plan_name,s.amount_cents
 FROM public.asaas_contracts c JOIN public.billing_subscriptions s ON s.id=c.subscription_id JOIN public.billing_plans b ON b.id=s.plan_id JOIN public.profiles p ON p.id=c.profile_id
 WHERE b.audience='assinante' AND s.status IN ('draft','past_due') AND c.created_at < now()-interval '24 hours'
 AND c.paid_until IS NULL AND c.trial_until IS NULL AND p.is_active
 AND (c.lease_until IS NULL OR c.lease_until<=now())
 AND NOT EXISTS(SELECT 1 FROM public.asaas_payment_events e WHERE e.contract_id=c.id AND e.state='paid')
 AND NOT EXISTS(SELECT 1 FROM public.billing_charges ch WHERE ch.subscription_id=s.id AND ch.paid_at IS NOT NULL)
 AND NOT EXISTS(SELECT 1 FROM public.billing_subscriptions current_subscription WHERE current_subscription.profile_id=c.profile_id AND current_subscription.status='active')
 ), page AS (SELECT * FROM eligible ORDER BY created_at DESC,id OFFSET _offset LIMIT _limit)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM eligible),'items',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id) FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_pending_connection_checkouts(integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_connection_checkouts(integer,integer) TO authenticated;
COMMENT ON FUNCTION public.get_pending_connection_checkouts(integer,integer) IS 'Admin-only manual recovery of first-payment checkouts; excludes paid, trial, inactive and canceled records. No writes or provider requests.';