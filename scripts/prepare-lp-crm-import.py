#!/usr/bin/env python3
"""Copyright © 2026 Ranktop SEO Inteligente. Author: Diogo Devitte.

Generate a transactional, idempotent historical import; never call live intake.
Usage: python3 scripts/prepare-lp-crm-import.py leads.csv output.sql
"""
import csv
import json
import pathlib
import sys

PROJECT = 'kcnoqgnrwdjphjzqjnle'


def build_sql(rows):
    if len(rows) != 686 or len({r['id'] for r in rows}) != 686:
        raise ValueError('Expected exactly 686 unique source records.')
    if len({r['email'].strip().lower() for r in rows}) != 541:
        raise ValueError('Expected 541 normalized emails.')
    for row in rows:
        if row['source'] not in ('gentehub', 'participe', 'comunidade', 'impulso'):
            raise ValueError('Unknown source.')
    payload = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
    if '$captures$' in payload:
        raise ValueError('Unsafe SQL delimiter.')
    return HEADER + "\nINSERT INTO lp_input SELECT value FROM jsonb_array_elements($captures$" + payload + "$captures$::jsonb);\n" + BODY


HEADER = """-- Copyright © 2026 Ranktop SEO Inteligente. Author: Diogo Devitte.
-- Private historical import. Contains personal data; never commit or publish.
-- Existing CRM states, profiles, roles, invitations and consent are untouched.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE public.crm_leads IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.profiles, public.invitations, public.user_roles IN SHARE MODE;
LOCK TABLE public.crm_historical_captures IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE lp_input (payload jsonb NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE lp_before ON COMMIT DROP AS
SELECT 'invitations' kind,count(*) n FROM public.invitations
UNION ALL SELECT 'profiles',count(*) FROM public.profiles
UNION ALL SELECT 'roles',count(*) FROM public.user_roles
UNION ALL SELECT 'attendances',count(*) FROM public.attendances
UNION ALL SELECT 'lead_attendances',count(*) FROM public.meeting_lead_attendances
UNION ALL SELECT 'rescue',count(*) FROM public.rescue_dispatches
UNION ALL SELECT 'notifications',count(*) FROM public.notification_dispatch_log
UNION ALL SELECT 'billing',count(*) FROM public.billing_charges;
CREATE TEMP TABLE lp_existing_crm ON COMMIT DROP AS SELECT id,to_jsonb(l) original FROM public.crm_leads l;
"""

BODY = """
DO $$ BEGIN
 IF (SELECT count(*) FROM lp_input) <> 686 OR
    (SELECT count(DISTINCT lower(btrim(payload->>'email'))) FROM lp_input) <> 541
 THEN RAISE EXCEPTION 'Invalid historical input'; END IF;
END $$;
INSERT INTO public.crm_historical_captures
 (source_project,source_record_id,source_page_id,captured_at,payload)
SELECT 'kcnoqgnrwdjphjzqjnle',(payload->>'id')::uuid,
 (payload->>'landing_page_id')::uuid,(payload->>'created_at')::timestamptz,payload
FROM lp_input ON CONFLICT (source_project,source_record_id) DO NOTHING;
DO $$ BEGIN
 IF EXISTS (
 SELECT 1 FROM lp_input i JOIN public.crm_historical_captures h
 ON h.source_project='kcnoqgnrwdjphjzqjnle' AND h.source_record_id=(i.payload->>'id')::uuid
 WHERE h.payload IS DISTINCT FROM i.payload)
 THEN RAISE EXCEPTION 'Source ID collision: historical payload differs'; END IF;
END $$;
CREATE TEMP TABLE lp_group ON COMMIT DROP AS
SELECT lower(btrim(payload->>'email')) email,
 array_agg(DISTINCT right(regexp_replace(payload->>'phone','\\D','','g'),11))
 FILTER (WHERE length(regexp_replace(payload->>'phone','\\D','','g'))>=8) phones
FROM lp_input GROUP BY 1;
CREATE TEMP TABLE lp_matches ON COMMIT DROP AS
SELECT g.*,
 ARRAY(SELECT l.id FROM public.crm_leads l WHERE lower(btrim(l.email))=g.email) email_leads,
 ARRAY(SELECT l.id FROM public.crm_leads l WHERE length(l.phone_digits)>=8 AND l.phone_digits=ANY(g.phones)) phone_leads,
 ARRAY(SELECT p.id FROM public.profiles p WHERE lower(btrim(p.email))=g.email OR (length(p.phone_digits)>=8 AND p.phone_digits=ANY(g.phones))) profiles,
 ARRAY(SELECT i.id FROM public.invitations i WHERE lower(btrim(i.email))=g.email OR (length(regexp_replace(coalesce(i.metadata->>'phone',''),'\\D','','g'))>=8 AND right(regexp_replace(i.metadata->>'phone','\\D','','g'),11)=ANY(g.phones))) invitations,
 EXISTS(SELECT 1 FROM lp_group other WHERE other.email<>g.email AND other.phones && g.phones) shared_phone
FROM lp_group g;
-- Phone-only matches and shared phones are review candidates, never permission to merge.
UPDATE public.crm_historical_captures h SET
 decision=CASE
 WHEN cardinality(m.email_leads)=1 AND NOT m.shared_phone
  AND NOT EXISTS(SELECT 1 FROM unnest(m.phone_leads) x WHERE x<>m.email_leads[1])
  AND NOT EXISTS(SELECT 1 FROM public.crm_leads l WHERE l.id=m.email_leads[1] AND l.archived_at IS NOT NULL)
  AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=ANY(m.profiles) AND p.id IS DISTINCT FROM (SELECT profile_id FROM public.crm_leads WHERE id=m.email_leads[1]))
  AND NOT EXISTS(SELECT 1 FROM public.invitations i WHERE i.id=ANY(m.invitations) AND i.accepted_by IS NOT NULL AND i.accepted_by IS DISTINCT FROM (SELECT profile_id FROM public.crm_leads WHERE id=m.email_leads[1]))
 THEN 'matched_existing'
 WHEN cardinality(m.email_leads)=0 AND cardinality(m.phone_leads)=0
  AND cardinality(m.profiles)=0 AND cardinality(m.invitations)=0 AND NOT m.shared_phone
 THEN 'approved_new'
 ELSE 'pending_review' END,
 lead_id=CASE WHEN cardinality(m.email_leads)=1 THEN m.email_leads[1] ELSE NULL END,
 profile_ids=m.profiles,invitation_ids=m.invitations,
 match_details=jsonb_build_object('email_leads',m.email_leads,'phone_leads',m.phone_leads,'shared_export_phone',m.shared_phone)
FROM lp_matches m WHERE h.source_project='kcnoqgnrwdjphjzqjnle'
 AND lower(btrim(h.payload->>'email'))=m.email
 AND h.decision NOT IN ('imported_new');
CREATE TEMP TABLE lp_first ON COMMIT DROP AS
SELECT DISTINCT ON (lower(btrim(h.payload->>'email'))) h.*
FROM public.crm_historical_captures h
WHERE h.source_project='kcnoqgnrwdjphjzqjnle' AND h.decision='approved_new'
ORDER BY lower(btrim(h.payload->>'email')),h.captured_at,h.source_record_id;
INSERT INTO public.crm_leads
 (name,email,phone,company,business_segment,source,source_detail,status,notes,
 created_at,onboarding_category,onboarding_status,onboarding_email_status,rescue_opt_out,metadata)
SELECT btrim(payload->>'name'),lower(btrim(payload->>'email')),
 CASE WHEN length(regexp_replace(payload->>'phone','\\D','','g'))>=8 THEN NULLIF(payload->>'phone','') ELSE NULL END,
 NULLIF(payload->>'company',''),NULLIF(payload->>'segment',''),
 CASE WHEN payload->>'source'='gentehub' THEN 'lp_gentehub'::public.crm_lead_source ELSE 'lp_participe'::public.crm_lead_source END,
 'Histórico LP: '||(payload->>'source'),'novo',NULLIF(payload->>'notes',''),captured_at,
 CASE WHEN payload->>'source'='gentehub' THEN 'gente_hub' ELSE payload->>'source' END,
 'cadastro_recebido','not_applicable',true,
 jsonb_build_object('historical_import',true,'historical_source_project','kcnoqgnrwdjphjzqjnle',
 'historical_first_capture_id',source_record_id,'page_url','https://lps.gentenetworking.com.br/'||(payload->>'source'),
 'rescue_suppression_reason','historical_import_safety_not_user_unsubscribe')
FROM lp_first
ON CONFLICT DO NOTHING;
UPDATE public.crm_historical_captures h SET decision='imported_new',lead_id=l.id
FROM public.crm_leads l WHERE h.source_project='kcnoqgnrwdjphjzqjnle'
 AND h.decision='approved_new' AND lower(btrim(h.payload->>'email'))=lower(l.email)
 AND l.metadata->>'historical_source_project'='kcnoqgnrwdjphjzqjnle';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.crm_historical_captures WHERE source_project='kcnoqgnrwdjphjzqjnle' AND decision='approved_new')
 THEN RAISE EXCEPTION 'Insert conflict: manual review required'; END IF;
 IF EXISTS(SELECT 1 FROM lp_existing_crm b JOIN public.crm_leads l USING(id) WHERE to_jsonb(l) IS DISTINCT FROM b.original)
 THEN RAISE EXCEPTION 'Existing CRM state changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.crm_leads WHERE metadata->>'historical_source_project'='kcnoqgnrwdjphjzqjnle'
  AND (NOT rescue_opt_out OR onboarding_email_status<>'not_applicable' OR invitation_id IS NOT NULL
    OR profile_id IS NOT NULL OR meeting_attendance_count<>0 OR first_attendance_at IS NOT NULL OR last_attendance_at IS NOT NULL))
 THEN RAISE EXCEPTION 'Historical safety invariant failed'; END IF;
 IF EXISTS(SELECT kind,n FROM lp_before EXCEPT (
 SELECT 'invitations',count(*) FROM public.invitations
 UNION ALL SELECT 'profiles',count(*) FROM public.profiles
 UNION ALL SELECT 'roles',count(*) FROM public.user_roles
 UNION ALL SELECT 'attendances',count(*) FROM public.attendances
 UNION ALL SELECT 'lead_attendances',count(*) FROM public.meeting_lead_attendances
 UNION ALL SELECT 'rescue',count(*) FROM public.rescue_dispatches
 UNION ALL SELECT 'notifications',count(*) FROM public.notification_dispatch_log
 UNION ALL SELECT 'billing',count(*) FROM public.billing_charges))
 THEN RAISE EXCEPTION 'Unintended side effect'; END IF;
END $$;
SELECT decision,count(*) captures,count(DISTINCT lower(btrim(payload->>'email'))) emails
FROM public.crm_historical_captures WHERE source_project='kcnoqgnrwdjphjzqjnle' GROUP BY decision;
COMMIT;
"""


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8-sig', newline='') as source:
        rows = list(csv.DictReader(source))
    pathlib.Path(sys.argv[2]).write_text(build_sql(rows), encoding='utf-8')
    print('Prepared 686 captures / 541 emails; no database changes executed.')