
-- Drop duplicate triggers (keep one per function per table)
DROP TRIGGER IF EXISTS trigger_business_deal_delete ON public.business_deals;
DROP TRIGGER IF EXISTS trigger_business_deal_insert ON public.business_deals;
DROP TRIGGER IF EXISTS trigger_updated_at_contents ON public.contents;
DROP TRIGGER IF EXISTS trigger_best_answer_update ON public.council_replies;
DROP TRIGGER IF EXISTS trigger_council_reply_insert ON public.council_replies;
DROP TRIGGER IF EXISTS trigger_gente_em_acao_delete ON public.gente_em_acao;
DROP TRIGGER IF EXISTS trigger_gente_em_acao_insert ON public.gente_em_acao;
DROP TRIGGER IF EXISTS trigger_invitation_accepted ON public.invitations;
DROP TRIGGER IF EXISTS trigger_profile_slug ON public.profiles;
DROP TRIGGER IF EXISTS trigger_referral_delete ON public.referrals;
DROP TRIGGER IF EXISTS trigger_referral_insert ON public.referrals;
DROP TRIGGER IF EXISTS trigger_updated_at_teams ON public.teams;
DROP TRIGGER IF EXISTS trigger_testimonial_delete ON public.testimonials;
DROP TRIGGER IF EXISTS trigger_testimonial_insert ON public.testimonials;

-- Also check business_cases (has trigger_business_case_insert/delete and trigger_updated_at_business_cases)
-- These may be the only ones - verify by NOT dropping unless duplicated. business_cases didn't show in dup list.

-- Deduplicate existing activity_feed entries (keep oldest per logical event)
DELETE FROM public.activity_feed a
USING public.activity_feed b
WHERE a.ctid > b.ctid
  AND a.user_id = b.user_id
  AND a.activity_type = b.activity_type
  AND a.title = b.title
  AND COALESCE(a.reference_id::text, '') = COALESCE(b.reference_id::text, '')
  AND a.created_at = b.created_at;
