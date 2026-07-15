# Gulf Gate platform overhaul notes (2026-07-15)

## Critical fixes delivered
- Market IQD no longer renders `0`; IQD is derived from USD × `USD_TO_IQD_RATE` (default 1310) with timeout + full fallback.
- Public UI no longer exposes raw `LIVE_TRADING=false`, `RLS`, `AAL2`, or architecture jargon.
- Auth reset callback encodes nested `next` safely.
- Staff RPCs require AAL2 at the database layer (`202607150008_staff_rpc_aal2_and_fx_settings.sql`).
- CSRF same-origin check accepts configured host and Vercel preview hosts.
- Client/admin shells have pathname-preserving language switch, active nav, unread badge, and mobile drawer.
- Public security-compliance page added; robots/sitemap updated.

## Still manual / external
- Apply Supabase migration `202607150008_staff_rpc_aal2_and_fx_settings.sql` in the Supabase SQL editor or CLI.
- Confirm Email / SMTP settings remain operator-controlled in Supabase Auth.
- Contact fields require `NEXT_PUBLIC_*` env values on Vercel when ready.
- Custom domain still needs DNS + `NEXT_PUBLIC_APP_URL` cutover.
- LIVE_TRADING remains false by design.
