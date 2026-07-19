-- Corrective payment routing: Iraq/UAE methods, signed instructions, company legal gates.
-- Does NOT unlock LIVE_TRADING, REAL_PAYMENTS, or AUTO_FULFILLMENT.

-- Disable Stripe and generic manual_proof for Iraq; ensure FIB/SuperQi/Zain Cash/bank are preferred.
update public.payment_method_availability pma
set enabled = false, updated_at = now()
from public.payment_methods pm
where pma.payment_method_id = pm.id
  and pma.country_code = 'IQ'
  and pm.code in ('stripe_card', 'manual_proof', 'eand_money', 'dupay', 'cash_representative', 'wallet_transfer');

-- Ensure Iraq matrix rows exist, but keep them disabled until migration 016
-- verifies a configured payment account and synchronizes availability.
insert into public.payment_method_availability (
  payment_method_id, country_code, currency_code, enabled, min_amount, max_amount,
  percentage_fee, flat_fee, settlement_time_text_ar, settlement_time_text_en,
  requires_proof, requires_redirect, provider_approval_status, sort_order
)
select pm.id, 'IQ', 'IQD', false, seed.min_amount, seed.max_amount,
       0, 0, seed.settlement_ar, seed.settlement_en,
       true, false, 'not_required', seed.sort_order
from public.payment_methods pm
join (
  values
    ('fib', 10000::numeric, 50000000::numeric, 'مراجعة إثبات بعد التفعيل', 'Proof review once configured', 10),
    ('superqi', 10000::numeric, 50000000::numeric, 'مراجعة إثبات بعد التفعيل', 'Proof review once configured', 20),
    ('zain_cash', 10000::numeric, 50000000::numeric, 'مراجعة إثبات أو API الرسمي عند التفعيل', 'Proof review or official API once enabled', 30),
    ('bank_transfer', 50000::numeric, 100000000::numeric, 'مراجعة بشرية بعد التحويل العراقي', 'Human review after Iraqi bank transfer', 40)
) as seed(code, min_amount, max_amount, settlement_ar, settlement_en, sort_order)
  on pm.code = seed.code
on conflict (payment_method_id, country_code, currency_code) do update set
  min_amount = excluded.min_amount,
  max_amount = excluded.max_amount,
  settlement_time_text_ar = excluded.settlement_time_text_ar,
  settlement_time_text_en = excluded.settlement_time_text_en,
  requires_proof = true,
  requires_redirect = false,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Keep catalog entries available for configuration; public country availability
-- is controlled separately and remains fail-closed.
update public.payment_methods
set active = true,
    integration_mode = case when code in ('fib','superqi','bank_transfer') then 'manual' else coalesce(integration_mode, 'manual') end,
    requires_proof = true,
    updated_at = now()
where code in ('fib', 'superqi', 'zain_cash', 'bank_transfer');

update public.payment_methods
set active = false,
    provider_approval_status = 'pending',
    integration_mode = 'disabled',
    updated_at = now()
where code = 'stripe_card';

-- Country display names for UAE
update public.countries
set name_ar = 'الإمارات العربية المتحدة',
    name_en = 'United Arab Emirates',
    updated_at = now()
where code = 'AE';

-- Primary selector: keep IQ/AE/OTHER ordered first; others remain available to the allowlist admin.
update public.countries set sort_order = 10 where code = 'IQ';
update public.countries set sort_order = 20 where code = 'AE';
update public.countries set sort_order = 900 where code = 'OTHER';

-- Iraq / UAE provider account configs (admin only; ciphertext columns — never public)
create table if not exists public.country_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code),
  payment_method_code text not null,
  display_name_ar text not null,
  display_name_en text not null,
  integration_mode text not null default 'manual' check (integration_mode in ('api', 'manual', 'disabled')),
  enabled boolean not null default false,
  currency_code text not null,
  min_amount numeric(18,2),
  max_amount numeric(18,2),
  percentage_fee numeric(8,4) not null default 0,
  flat_fee numeric(18,2) not null default 0,
  settlement_time_text_ar text,
  settlement_time_text_en text,
  instructions_ar text,
  instructions_en text,
  -- Encrypted / secret material — service role & staff only
  account_payload_encrypted text,
  qr_storage_path text,
  sort_order int not null default 100,
  valid_from timestamptz,
  valid_to timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, payment_method_code, currency_code)
);

-- Repair an earlier partially-created table whose check allowed only api/manual.
do $$
declare
  constr text;
begin
  for constr in
    select conname
    from pg_constraint
    where conrelid = 'public.country_payment_accounts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%integration_mode%'
  loop
    execute format('alter table public.country_payment_accounts drop constraint %I', constr);
  end loop;

  alter table public.country_payment_accounts
    add constraint country_payment_accounts_integration_mode_check
    check (integration_mode in ('api', 'manual', 'disabled'));
end $$;

drop trigger if exists country_payment_accounts_updated_at on public.country_payment_accounts;
create trigger country_payment_accounts_updated_at before update on public.country_payment_accounts
  for each row execute function public.set_updated_at();

-- All rows are seeded disabled. Staff must add real account details or approved
-- provider configuration before enabling them.
insert into public.country_payment_accounts (
  country_code, payment_method_code, display_name_ar, display_name_en,
  integration_mode, enabled, currency_code, sort_order, instructions_ar, instructions_en
) values
  ('IQ', 'fib', 'FIB', 'FIB', 'manual', false, 'IQD', 10,
   'بعد إنشاء الطلب ستظهر تعليمات FIB المرتبطة بطلبك فقط.',
   'After order creation, FIB instructions for your order only will appear.'),
  ('IQ', 'superqi', 'SuperQi', 'SuperQi', 'manual', false, 'IQD', 20,
   'بعد إنشاء الطلب ستظهر تعليمات SuperQi المرتبطة بطلبك فقط.',
   'After order creation, SuperQi instructions for your order only will appear.'),
  ('IQ', 'zain_cash', 'زين كاش', 'Zain Cash', 'manual', false, 'IQD', 30,
   'بعد إنشاء الطلب ستظهر تعليمات زين كاش المرتبطة بطلبك فقط.',
   'After order creation, Zain Cash instructions for your order only will appear.'),
  ('IQ', 'bank_transfer', 'تحويل بنكي عراقي', 'Iraqi Bank Transfer', 'manual', false, 'IQD', 40,
   'بعد إنشاء الطلب ستظهر بيانات التحويل البنكي العراقي لطلبك فقط.',
   'After order creation, Iraqi bank transfer details for your order only will appear.'),
  ('AE', 'stripe_card', 'Stripe', 'Stripe', 'disabled', false, 'AED', 10,
   'Stripe يظهر فقط بعد اكتمال مفاتيح الإنتاج وWebhook وموافقة النشاط.',
   'Stripe appears only after production keys, webhook, and business approval are complete.'),
  ('AE', 'eand_money', 'e& money', 'e& money', 'manual', false, 'AED', 20,
   'وضع يدوي — التعليمات بعد إنشاء الطلب.',
   'Manual route — instructions appear after order creation.'),
  ('AE', 'dupay', 'du Pay', 'du Pay', 'manual', false, 'AED', 30,
   'وضع يدوي — بلا ادعاء شراكة أو API.',
   'Manual route — no partnership or API claim.'),
  ('AE', 'bank_transfer', 'تحويل بنكي إماراتي', 'UAE Bank Transfer', 'manual', false, 'AED', 40,
   'تعليمات التحويل البنكي الإماراتي تظهر بعد إنشاء الطلب.',
   'UAE bank transfer instructions appear after order creation.')
on conflict (country_code, payment_method_code, currency_code) do update set
  display_name_ar = excluded.display_name_ar,
  display_name_en = excluded.display_name_en,
  updated_at = now();

-- Signed payment instructions bound to order + user + expiry (not public catalog)
create table if not exists public.signed_payment_instructions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  country_code text not null,
  payment_method_code text not null,
  payment_reference text not null,
  amount numeric(18,2) not null,
  currency_code text not null,
  instructions_ar text not null,
  instructions_en text not null,
  display_account_label text,
  -- Revealed account snapshot for this order only (never raw admin secrets table)
  revealed_payee_masked text,
  qr_signed_url_expires_at timestamptz,
  signature_hmac text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id)
);

create index if not exists signed_payment_instructions_user_idx
  on public.signed_payment_instructions(user_id, created_at desc);

-- Company legal verification marker (admin)
insert into public.site_settings (key, value, description)
values
  ('company_legal_details_verified', 'false'::jsonb, 'When true and VARA fields complete, legal footer may show verified licence data'),
  ('company_verified_legal_address', '""'::jsonb, 'Admin-only draft until COMPANY_LEGAL_DETAILS_VERIFIED'),
  ('schema_migration_marker', '"202607150015"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

update public.site_settings
set value = 'false'::jsonb, updated_at = now()
where key = 'live_trading';

-- RLS
alter table public.country_payment_accounts enable row level security;
alter table public.signed_payment_instructions enable row level security;

drop policy if exists country_payment_accounts_staff on public.country_payment_accounts;
create policy country_payment_accounts_staff on public.country_payment_accounts
  for all using (public.has_staff_role(array['super_admin','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));

-- Public may only see non-secret catalog fields via a restricted view
create or replace view public.country_payment_methods_public as
select
  id,
  country_code,
  payment_method_code,
  display_name_ar,
  display_name_en,
  integration_mode,
  enabled,
  currency_code,
  min_amount,
  max_amount,
  percentage_fee,
  flat_fee,
  settlement_time_text_ar,
  settlement_time_text_en,
  sort_order
from public.country_payment_accounts
where enabled = true
  and (valid_from is null or valid_from <= now())
  and (valid_to is null or valid_to >= now());

grant select on public.country_payment_methods_public to anon, authenticated;

drop policy if exists signed_payment_instructions_owner on public.signed_payment_instructions;
create policy signed_payment_instructions_owner on public.signed_payment_instructions
  for select using (user_id = (select auth.uid()) and revoked_at is null and expires_at > now());

drop policy if exists signed_payment_instructions_staff on public.signed_payment_instructions;
create policy signed_payment_instructions_staff on public.signed_payment_instructions
  for select using (public.has_staff_role(array['super_admin','operations','finance','reviewer']::public.staff_role[]));

drop trigger if exists audit_country_payment_accounts on public.country_payment_accounts;
create trigger audit_country_payment_accounts after insert or update or delete on public.country_payment_accounts
  for each row execute function public.audit_critical_change();

comment on table public.country_payment_accounts is 'Admin payment account configs. Secrets encrypted. Never expose via public API.';
comment on table public.signed_payment_instructions is 'Per-order signed instructions. Owner-only. Expires with order window.';
comment on view public.country_payment_methods_public is 'Public method names only — no account numbers, IBANs, phones, or merchant IDs.';
