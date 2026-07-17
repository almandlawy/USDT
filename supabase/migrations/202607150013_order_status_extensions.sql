-- Extend order_status enum for multi-provider payment + fulfillment review flow.
-- New values are added alone so they can be used in the next migration after commit.
-- LIVE_TRADING remains false. Auto fulfillment remains locked.

alter type public.order_status add value if not exists 'quote_created';
alter type public.order_status add value if not exists 'awaiting_customer';
alter type public.order_status add value if not exists 'payment_pending';
alter type public.order_status add value if not exists 'payment_received_pending_review';
alter type public.order_status add value if not exists 'kyc_required';
alter type public.order_status add value if not exists 'compliance_review';
alter type public.order_status add value if not exists 'approved_for_fulfillment';
alter type public.order_status add value if not exists 'fulfillment_in_progress';
alter type public.order_status add value if not exists 'fulfilled';
alter type public.order_status add value if not exists 'expired';
alter type public.order_status add value if not exists 'refunded';
alter type public.order_status add value if not exists 'disputed';

update public.site_settings
set value = 'false'::jsonb, updated_at = now()
where key = 'live_trading';

insert into public.site_settings (key, value)
values ('schema_migration_marker', '"202607150013"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
