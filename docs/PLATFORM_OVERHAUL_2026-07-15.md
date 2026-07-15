# Gulf Gate platform overhaul notes (2026-07-15)

## Critical fixes delivered (PR #6 + follow-up)
- Market IQD no longer renders `0`; IQD is derived from USD × FX (DB `market_fx_settings` when available, else `USD_TO_IQD_RATE`, default 1310) with timeout + full fallback.
- Public UI no longer exposes raw `LIVE_TRADING=false`, `RLS`, `AAL2`, or architecture jargon.
- Auth reset callback encodes nested `next` safely.
- Staff RPCs require AAL2 at the database layer (`202607150008_staff_rpc_aal2_and_fx_settings.sql`).
- CSRF same-origin check accepts configured host and Vercel preview hosts.
- Client/admin shells have pathname-preserving language switch, active nav, unread badge, and mobile drawer.
- Public security-compliance page added; robots/sitemap updated.
- Admin permission matrix enforced at page load + nav filtering.
- Admin rates page shows provider status, FX fallback editor, and FX audit history.
- Customer notifications: mark-one / mark-all read, deep links, DB triggers for KYC/order/proof/support.
- KYC progress uses document ladder percentages; rejected/resubmission hide success %.
- Support ticket thread UI with replies.
- `/api/health` safe probe.
- Playwright production smoke tests + CI step.

## Migrations to apply manually in Supabase
1. `202607150008_staff_rpc_aal2_and_fx_settings.sql` — AAL2 RPC gate + `market_fx_settings`.
2. `202607150009_customer_notifications_kyc_resubmit_fx_audit.sql` — customer notify triggers, KYC rejected resubmit policy, FX audit trigger, staff notification select.

## Still manual / external
- Confirm Email / SMTP settings remain operator-controlled in Supabase Auth.
- Contact fields require `NEXT_PUBLIC_*` env values on Vercel when ready.
- Custom domain still needs DNS + `NEXT_PUBLIC_APP_URL` cutover.
- LIVE_TRADING remains false by design.
