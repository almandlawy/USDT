# Supabase production checklist

## Apply migrations in order
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

Never edit already-applied migrations. Add a new dated file for fixes.

## Verify after apply
```sql
select to_regclass('public.market_fx_settings');
select to_regclass('public.market_fx_public');
select proname from pg_proc where proname in ('require_staff_aal2','update_market_fx','current_staff_role_label','purge_old_login_events');
select key, value from public.site_settings where key = 'live_trading';
```

Expect `live_trading` = false.

## Storage
Buckets `kyc-documents`, `payment-proofs`, `p2p-evidence` must be **private**.

## Auth
See `docs/AUTH_EMAIL_SETUP.md`.

## MFA
Staff admin routes require AAL2 in app + privileged RPCs.

## Roll-forward on failure
1. Keep Production on previous deployment.
2. Fix with a new migration (do not rewrite history).
3. Re-run verification queries.
4. Promote only after CI green.
