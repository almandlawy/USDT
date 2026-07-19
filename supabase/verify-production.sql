-- Gulf Gate production readiness verification
-- Run in Supabase SQL editor. Does not return customer PII.
-- LEGAL REVIEW REQUIRED BEFORE PUBLIC LAUNCH

with checks as (
  select 'live_trading_false'::text as check_id,
         coalesce((select value = 'false'::jsonb from public.site_settings where key = 'live_trading'), false) as ok
  union all
  select 'migration_marker_016_or_newer',
         coalesce((
           select replace(value::text, '"', '') >= '202607150016'
           from public.site_settings where key = 'schema_migration_marker'
         ), false)
  union all
  select 'payment_accounts_fail_closed',
         coalesce((select value = 'true'::jsonb from public.site_settings where key = 'payment_accounts_fail_closed'), false)
  union all
  select 'market_fx_settings_exists', to_regclass('public.market_fx_settings') is not null
  union all
  select 'market_fx_public_exists', to_regclass('public.market_fx_public') is not null
  union all
  select 'data_requests_exists', to_regclass('public.data_requests') is not null
  union all
  select 'countries_exists', to_regclass('public.countries') is not null
  union all
  select 'payment_method_availability_exists', to_regclass('public.payment_method_availability') is not null
  union all
  select 'quote_links_exists', to_regclass('public.quote_links') is not null
  union all
  select 'payment_webhook_events_exists', to_regclass('public.payment_webhook_events') is not null
  union all
  select 'country_payment_accounts_exists', to_regclass('public.country_payment_accounts') is not null
  union all
  select 'signed_payment_instructions_exists', to_regclass('public.signed_payment_instructions') is not null
  union all
  select 'country_payment_methods_public_exists', to_regclass('public.country_payment_methods_public') is not null
  union all
  select 'payment_account_mode_constraint_allows_disabled',
         exists (
           select 1
           from pg_constraint
           where conrelid = 'public.country_payment_accounts'::regclass
             and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%integration_mode%'
             and pg_get_constraintdef(oid) ilike '%disabled%'
         )
  union all
  select 'payment_account_enforcement_trigger_exists',
         exists (
           select 1
           from pg_trigger
           where tgname = 'enforce_country_payment_account_ready'
             and not tgisinternal
         )
  union all
  select 'payment_account_sync_trigger_exists',
         exists (
           select 1
           from pg_trigger
           where tgname = 'sync_country_payment_account_availability'
             and not tgisinternal
         )
  union all
  select 'no_empty_enabled_manual_accounts',
         not exists (
           select 1
           from public.country_payment_accounts
           where enabled = true
             and integration_mode = 'manual'
             and coalesce(account_payload_encrypted, '') = ''
             and coalesce(qr_storage_path, '') = ''
         )
  union all
  select 'no_unsupported_api_accounts',
         not exists (
           select 1
           from public.country_payment_accounts
           where integration_mode = 'api'
             and payment_method_code not in ('stripe_card', 'zain_cash')
         )
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
  select coalesce((select replace(value::text, '"', '') >= '202607150016' from public.site_settings where key = 'schema_migration_marker'), false)
  union all
  select coalesce((select value = 'true'::jsonb from public.site_settings where key = 'payment_accounts_fail_closed'), false)
  union all
  select to_regclass('public.payment_method_availability') is not null
  union all
  select to_regclass('public.quote_links') is not null
  union all
  select to_regclass('public.country_payment_accounts') is not null
  union all
  select to_regclass('public.signed_payment_instructions') is not null
  union all
  select to_regclass('public.data_requests') is not null
  union all
  select to_regprocedure('public.require_staff_aal2()') is not null
  union all
  select exists (select 1 from pg_trigger where tgname = 'enforce_country_payment_account_ready' and not tgisinternal)
  union all
  select not exists (
    select 1 from public.country_payment_accounts
    where enabled = true
      and integration_mode = 'manual'
      and coalesce(account_payload_encrypted, '') = ''
      and coalesce(qr_storage_path, '') = ''
  )
  union all
  select not exists (
    select 1 from public.country_payment_accounts
    where integration_mode = 'api'
      and payment_method_code not in ('stripe_card', 'zain_cash')
  )
) s;
