-- Fail closed for payment account availability and keep the public matrix in sync.
-- Does not enable LIVE_TRADING, REAL_PAYMENTS, or AUTO_FULFILLMENT.

create or replace function public.enforce_country_payment_account_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.integration_mode = 'disabled' then
    new.enabled := false;
    return new;
  end if;

  if new.integration_mode = 'api'
     and new.payment_method_code not in ('stripe_card', 'zain_cash') then
    raise exception 'API_MODE_NOT_IMPLEMENTED_FOR_PAYMENT_METHOD';
  end if;

  if new.enabled
     and new.integration_mode = 'manual'
     and coalesce(new.account_payload_encrypted, '') = ''
     and coalesce(new.qr_storage_path, '') = '' then
    raise exception 'PAYMENT_ACCOUNT_DETAILS_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_country_payment_account_ready() from public;

drop trigger if exists enforce_country_payment_account_ready on public.country_payment_accounts;
create trigger enforce_country_payment_account_ready
before insert or update of enabled, integration_mode, payment_method_code,
  account_payload_encrypted, qr_storage_path, valid_from, valid_to
on public.country_payment_accounts
for each row execute function public.enforce_country_payment_account_ready();

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
    and new.integration_mode <> 'disabled'
    and (new.valid_from is null or new.valid_from <= now())
    and (new.valid_to is null or new.valid_to >= now())
    and (
      new.integration_mode = 'api'
      or coalesce(new.account_payload_encrypted, '') <> ''
      or coalesce(new.qr_storage_path, '') <> ''
    );

  if method_id is not null then
    update public.payment_method_availability
    set enabled = effective_enabled,
        min_amount = new.min_amount,
        max_amount = new.max_amount,
        percentage_fee = new.percentage_fee,
        flat_fee = new.flat_fee,
        settlement_time_text_ar = new.settlement_time_text_ar,
        settlement_time_text_en = new.settlement_time_text_en,
        requires_proof = case when new.integration_mode = 'manual' then true else false end,
        requires_redirect = case when new.integration_mode = 'api' then true else false end,
        provider_approval_status = case
          when new.integration_mode = 'disabled' then 'disabled'
          when new.integration_mode = 'api' then 'approved'
          else 'not_required'
        end,
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
after insert or update of enabled, integration_mode, payment_method_code,
  account_payload_encrypted, qr_storage_path, min_amount, max_amount,
  percentage_fee, flat_fee, settlement_time_text_ar, settlement_time_text_en,
  sort_order, valid_from, valid_to
on public.country_payment_accounts
for each row execute function public.sync_country_payment_account_availability();

-- Seeded placeholders must never appear as active payment routes until real
-- encrypted account details or a QR asset have been configured by staff.
update public.country_payment_accounts
set enabled = false
where integration_mode = 'manual'
  and coalesce(account_payload_encrypted, '') = ''
  and coalesce(qr_storage_path, '') = '';

-- API mode is only supported by implemented adapters.
update public.country_payment_accounts
set integration_mode = 'manual',
    enabled = false
where integration_mode = 'api'
  and payment_method_code not in ('stripe_card', 'zain_cash');

-- Re-run the sync trigger for every existing row. UPDATE OF fires even when
-- the assigned value is unchanged.
update public.country_payment_accounts
set enabled = enabled;

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
