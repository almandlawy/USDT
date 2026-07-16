# Supabase production checklist

## Migration order

1. `202607150001_initial_schema.sql`
2. `202607150002_complete_platform.sql`
3. `202607150003_rbac_and_risk_controls.sql`
4. `202607150004_ops_queue.sql`
5. `202607150005_workflows_levels_chat_batches.sql`
6. `202607150006_intelligence_and_dual_control.sql`
7. `202607150007_rate_limit_digest_schema.sql`
8. `202607150008_staff_rpc_aal2_and_fx_settings.sql`
9. `202607150009_customer_notifications_kyc_resubmit_fx_audit.sql`
10. `202607150010_production_readiness_hardening.sql`
11. `202607150011_kyc_customer_reason_and_data_requests.sql`

## Verify 008–011

```sql
select key, value from public.site_settings where key in ('live_trading','schema_migration_marker');
select to_regprocedure('public.require_staff_aal2()') is not null;
select to_regprocedure('public.current_staff_role_label()') is not null;
select to_regclass('public.market_fx_settings') is not null;
select to_regclass('public.market_fx_public') is not null;
select to_regprocedure('public.update_market_fx(numeric,numeric,text)') is not null;
select to_regprocedure('public.purge_old_login_events()') is not null;
select to_regclass('public.data_requests') is not null;
select column_name from information_schema.columns
 where table_schema='public' and table_name='kyc_cases'
   and column_name in ('customer_reason','internal_review_notes');
```

Expected: `live_trading` is `false`, marker is at least `202607150011`.

## Storage

Confirm buckets `kyc-documents`, `payment-proofs`, `p2p-evidence` exist and are **private**.

## Auth

- Site URL = production origin
- Redirect URLs include `/auth/callback` and locale paths
- Confirm email OFF for current direct-login UX (operator decision)
- MFA available for staff

## Roll-forward

Never edit applied migrations. Add a new numbered migration if a fix is required.
