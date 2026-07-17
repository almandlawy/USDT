-- Gulf Gate production readiness verification
-- Run in Supabase SQL editor. Does not return customer PII.
-- LEGAL REVIEW REQUIRED BEFORE PUBLIC LAUNCH

with checks as (
  select 'live_trading_false'::text as check_id,
         coalesce((select value = 'false'::jsonb from public.site_settings where key = 'live_trading'), false) as ok
  union all
  select 'migration_marker_011_or_newer',
         coalesce((
           select replace(value::text, '"', '') >= '202607150011'
           from public.site_settings where key = 'schema_migration_marker'
         ), false)
  union all
  select 'market_fx_settings_exists', to_regclass('public.market_fx_settings') is not null
  union all
  select 'market_fx_public_exists', to_regclass('public.market_fx_public') is not null
  union all
  select 'data_requests_exists', to_regclass('public.data_requests') is not null
  union all
  select 'kyc_customer_reason_column',
         exists (
           select 1 from information_schema.columns
           where table_schema='public' and table_name='kyc_cases' and column_name='customer_reason'
         )
  union all
  select 'kyc_internal_notes_column',
         exists (
           select 1 from information_schema.columns
           where table_schema='public' and table_name='kyc_cases' and column_name='internal_review_notes'
         )
  union all
  select 'require_staff_aal2', to_regprocedure('public.require_staff_aal2()') is not null
  union all
  select 'current_staff_role_label', to_regprocedure('public.current_staff_role_label()') is not null
  union all
  select 'purge_old_login_events', to_regprocedure('public.purge_old_login_events()') is not null
  union all
  select 'kyc_documents_bucket_private',
         exists (select 1 from storage.buckets where id = 'kyc-documents' and public = false)
  union all
  select 'payment_proofs_bucket_private',
         exists (select 1 from storage.buckets where id = 'payment-proofs' and public = false)
  union all
  select 'p2p_evidence_bucket_private',
         exists (select 1 from storage.buckets where id = 'p2p-evidence' and public = false)
)
select
  check_id,
  case when ok then 'PASS' else 'FAIL' end as result
from checks
order by check_id;

select
  case when bool_and(ok) then 'OVERALL_PASS' else 'OVERALL_FAIL' end as overall
from (
  select coalesce((select value = 'false'::jsonb from public.site_settings where key = 'live_trading'), false) as ok
  union all
  select to_regclass('public.data_requests') is not null
  union all
  select to_regprocedure('public.require_staff_aal2()') is not null
) s;
