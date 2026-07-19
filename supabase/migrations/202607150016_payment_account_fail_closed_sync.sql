-- Fail closed for payment account availability and keep the public matrix in sync.
-- Does not enable LIVE_TRADING, REAL_PAYMENTS, or AUTO_FULFILLMENT.

create or replace function public.sync_country_payment_account_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  method_id uuid;
  effective_enabled boolean;
begin
  select id into method_id
  from public.payment_methods
  where code = new.payment_method_code
  limit 1;

  effective_enabled := new.enabled
    and (new.valid_from is null or new.valid_from <= now())
    and (new.valid_to is null or new.valid_to >= now());

  if method_id is not null then
    update public.payment_method_availability
    set enabled = effective_enabled,
        min_amount = new.min_amount,
        max_amount = new.max_amount,
        percentage_fee = new.percentage_fee,
        flat_fee = new.flat_fee,
        settlement_time_text_ar = new.settlement_time_text_ar,
        settlement_time_text_en = new.settlement_time_text_en,
        requires_proof = case when new.integration_mode = 'manual' then true else requires_proof end,
        requires_redirect = case when new.integration_mode = 'api' then true else false end,
        sort_order = new.sort_order,
        updated_at = now()
    where payment_method_id = method_id
      and country_code = new.country_code
      and currency_code = new.currency_code;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_country_payment_account_availability() from public;

drop trigger if exists sync_country_payment_account_availability on public.country_payment_accounts;
create trigger sync_country_payment_account_availability
after insert or update of enabled, integration_mode, min_amount, max_amount,
  percentage_fee, flat_fee, settlement_time_text_ar, settlement_time_text_en,
  sort_order, valid_from, valid_to
on public.country_payment_accounts
for each row execute function public.sync_country_payment_account_availability();

-- Seeded placeholders must never appear as active payment routes until real
-- encrypted account details or a QR asset have been configured by staff.
update public.country_payment_accounts
set enabled = false,
    updated_at = now()
where integration_mode = 'manual'
  and coalesce(account_payload_encrypted, '') = ''
  and coalesce(qr_storage_path, '') = '';

-- Re-run the sync for all existing rows after the fail-closed update.
update public.country_payment_accounts
set updated_at = now();

insert into public.site_settings (key, value, description)
values
  ('schema_migration_marker', '"202607150016"'::jsonb, 'Latest applied Gulf Gate migration'),
  ('payment_accounts_fail_closed', 'true'::jsonb, 'Payment methods require configured account details before public availability')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

update public.site_settings
set value = 'false'::jsonb,
    updated_at = now()
where key = 'live_trading';
