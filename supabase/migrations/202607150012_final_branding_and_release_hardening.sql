-- Migration 012 — branding / release hardening markers (additive)
-- Does NOT unlock live trading, KYC intake, proof intake, or settlement.

insert into public.site_settings (key, value)
values
  ('schema_migration_marker', '"202607150012"'::jsonb),
  ('brand_assets_version', '"2026-07-17-gulf-gate-portal"'::jsonb),
  ('kyc_intake_default', 'false'::jsonb),
  ('proof_intake_default', 'false'::jsonb)
on conflict (key) do update
set value = excluded.value, updated_at = now();

-- Keep financial lock fail-closed
update public.site_settings
set value = 'false'::jsonb, updated_at = now()
where key = 'live_trading' and value is distinct from 'false'::jsonb;

-- Helpful indexes if missing (no-op when present)
create index if not exists notifications_user_read_created_idx
  on public.notifications (user_id, read_at, created_at desc);
create index if not exists support_tickets_user_status_idx
  on public.support_tickets (user_id, status, created_at desc);
create index if not exists data_requests_user_type_idx
  on public.data_requests (user_id, request_type, created_at desc);

comment on table public.data_requests is
  'Customer data rights requests. Audit logs are never auto-deleted by these requests.';
