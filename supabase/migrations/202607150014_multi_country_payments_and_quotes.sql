-- Multi-country payment matrix, quote links, webhook ledger, bank accounts.
-- Does NOT enable LIVE_TRADING, Stripe crypto, ZainCash production, or auto fulfillment.

-- ---------------------------------------------------------------------------
-- Countries
-- ---------------------------------------------------------------------------
create table if not exists public.countries (
  code text primary key check (char_length(code) between 2 and 8),
  name_ar text not null,
  name_en text not null,
  currency_code text not null check (char_length(currency_code) = 3),
  dialing_code text,
  enabled boolean not null default true,
  kyc_required boolean not null default false,
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high','blocked')),
  sanctions_blocked boolean not null default false,
  payment_region text not null default 'global',
  kyc_jurisdiction text,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger countries_updated_at before update on public.countries
  for each row execute function public.set_updated_at();

insert into public.countries (code, name_ar, name_en, currency_code, dialing_code, enabled, kyc_required, risk_level, sanctions_blocked, payment_region, kyc_jurisdiction, sort_order) values
  ('IQ', 'العراق', 'Iraq', 'IQD', '+964', true, true, 'medium', false, 'iraq', 'IQ', 10),
  ('AE', 'الإمارات', 'United Arab Emirates', 'AED', '+971', true, true, 'low', false, 'uae', 'AE', 20),
  ('SA', 'السعودية', 'Saudi Arabia', 'SAR', '+966', true, true, 'low', false, 'gcc', 'SA', 30),
  ('QA', 'قطر', 'Qatar', 'QAR', '+974', true, true, 'low', false, 'gcc', 'QA', 40),
  ('KW', 'الكويت', 'Kuwait', 'KWD', '+965', true, true, 'low', false, 'gcc', 'KW', 50),
  ('BH', 'البحرين', 'Bahrain', 'BHD', '+973', true, true, 'low', false, 'gcc', 'BH', 60),
  ('OM', 'عُمان', 'Oman', 'OMR', '+968', true, true, 'low', false, 'gcc', 'OM', 70),
  ('US', 'الولايات المتحدة', 'United States', 'USD', '+1', true, true, 'medium', false, 'americas', 'US', 80),
  ('GB', 'المملكة المتحدة', 'United Kingdom', 'GBP', '+44', true, true, 'low', false, 'europe', 'GB', 90),
  ('EU', 'دول الاتحاد الأوروبي', 'European Union', 'EUR', null, true, true, 'low', false, 'europe', 'EU', 100),
  ('OTHER', 'باقي دول العالم', 'Rest of world', 'USD', null, true, true, 'medium', false, 'global', 'OTHER', 900)
on conflict (code) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  currency_code = excluded.currency_code,
  dialing_code = excluded.dialing_code,
  enabled = excluded.enabled,
  kyc_required = excluded.kyc_required,
  risk_level = excluded.risk_level,
  sanctions_blocked = excluded.sanctions_blocked,
  payment_region = excluded.payment_region,
  kyc_jurisdiction = excluded.kyc_jurisdiction,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Payment method catalog extensions
-- ---------------------------------------------------------------------------
do $$
declare
  constr text;
begin
  for constr in
    select conname from pg_constraint
    where conrelid = 'public.payment_methods'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%code%'
  loop
    execute format('alter table public.payment_methods drop constraint %I', constr);
  end loop;
  alter table public.payment_methods
    add constraint payment_methods_code_check
    check (code in (
      'bank_transfer','fib','superqi','zain_cash','cash_representative','wallet_transfer',
      'stripe_card','eand_money','dupay','manual_proof'
    ));
end $$;

-- Expand fiat currencies for multi-country routing
do $$
declare constr text;
begin
  for constr in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%fiat_currency%'
  loop
    execute format('alter table public.orders drop constraint %I', constr);
  end loop;
  alter table public.orders
    add constraint orders_fiat_currency_check
    check (fiat_currency in ('USD','AED','IQD','SAR','QAR','KWD','BHD','OMR','EUR','GBP'));

  for constr in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%network%'
  loop
    execute format('alter table public.orders drop constraint %I', constr);
  end loop;
  alter table public.orders
    add constraint orders_network_check
    check (network in ('TRC20','ERC20','BEP20'));
end $$;

alter table public.payment_methods
  add column if not exists provider_key text,
  add column if not exists requires_proof boolean not null default true,
  add column if not exists requires_redirect boolean not null default false,
  add column if not exists provider_approval_status text not null default 'not_required'
    check (provider_approval_status in ('not_required','pending','approved','disabled')),
  add column if not exists integration_mode text not null default 'manual'
    check (integration_mode in ('manual','api','disabled'));

insert into public.payment_methods (
  code, name_ar, name_en, supported_currencies, active, sort_order,
  provider_key, requires_proof, requires_redirect, provider_approval_status, integration_mode,
  instructions_ar, instructions_en
) values
  ('stripe_card', 'بطاقة عبر Stripe', 'Stripe Card', array['USD','AED','EUR','GBP','SAR'], false, 5,
   'stripe', false, true, 'pending', 'disabled',
   'الدفع بالبطاقة غير متاح حالياً لهذا النوع من الطلبات.',
   'Card payment is not currently available for this type of order.'),
  ('eand_money', 'e& money (يدوي)', 'e& money (manual)', array['AED'], false, 25,
   'eand_money', true, false, 'not_required', 'manual',
   'ادفع عبر تطبيق e& money ثم ارفع إثبات الدفع. لا يوجد تأكيد تلقائي.',
   'Pay via the e& money app then upload proof. No automatic confirmation.'),
  ('dupay', 'du Pay (يدوي)', 'du Pay (manual)', array['AED'], false, 26,
   'dupay', true, false, 'not_required', 'manual',
   'ادفع عبر du Pay ثم ارفع إثبات الدفع. لا يوجد تأكيد تلقائي ولا شراكة معلنة.',
   'Pay via du Pay then upload proof. No automatic confirmation and no claimed partnership.'),
  ('manual_proof', 'إثبات دفع يدوي', 'Manual payment proof', array['USD','AED','IQD','SAR','QAR','KWD','BHD','OMR','EUR','GBP'], true, 90,
   'manual_proof', true, false, 'not_required', 'manual',
   'ارفع إيصالاً واضحاً مع مرجع التحويل. يبقى الطلب قيد المراجعة البشرية.',
   'Upload a clear receipt with the transfer reference. The order stays under human review.')
on conflict (code) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  provider_key = excluded.provider_key,
  requires_proof = excluded.requires_proof,
  requires_redirect = excluded.requires_redirect,
  provider_approval_status = excluded.provider_approval_status,
  integration_mode = excluded.integration_mode,
  updated_at = now();

update public.payment_methods
set provider_key = coalesce(provider_key, code),
    requires_proof = case when code in ('zain_cash','stripe_card') then false else coalesce(requires_proof, true) end,
    requires_redirect = case when code in ('zain_cash','stripe_card') then true else coalesce(requires_redirect, false) end,
    integration_mode = case
      when code = 'zain_cash' then 'api'
      when code = 'stripe_card' then 'disabled'
      else coalesce(integration_mode, 'manual')
    end
where provider_key is null or true;

-- ---------------------------------------------------------------------------
-- Payment method availability matrix (country × method)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_method_availability (
  id uuid primary key default gen_random_uuid(),
  payment_method_id uuid not null references public.payment_methods(id) on delete cascade,
  country_code text not null references public.countries(code),
  currency_code text not null check (char_length(currency_code) = 3),
  enabled boolean not null default false,
  min_amount numeric(18,2),
  max_amount numeric(18,2),
  percentage_fee numeric(8,4) not null default 0,
  flat_fee numeric(18,2) not null default 0,
  settlement_time_text_ar text,
  settlement_time_text_en text,
  requires_proof boolean not null default true,
  requires_redirect boolean not null default false,
  provider_approval_status text not null default 'not_required'
    check (provider_approval_status in ('not_required','pending','approved','disabled')),
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_method_id, country_code, currency_code)
);

create trigger payment_method_availability_updated_at before update on public.payment_method_availability
  for each row execute function public.set_updated_at();

create index if not exists payment_method_availability_country_idx
  on public.payment_method_availability(country_code, enabled, sort_order);

-- Seed matrix from payment method codes
insert into public.payment_method_availability (
  payment_method_id, country_code, currency_code, enabled, min_amount, max_amount,
  percentage_fee, flat_fee, settlement_time_text_ar, settlement_time_text_en,
  requires_proof, requires_redirect, provider_approval_status, sort_order
)
select pm.id, seed.country_code, seed.currency_code, seed.enabled, seed.min_amount, seed.max_amount,
       seed.percentage_fee, seed.flat_fee, seed.settlement_ar, seed.settlement_en,
       seed.requires_proof, seed.requires_redirect, seed.approval, seed.sort_order
from public.payment_methods pm
join (
  values
    -- Iraq
    ('zain_cash', 'IQ', 'IQD', true, 10000::numeric, 50000000::numeric, 0::numeric, 0::numeric,
     'حسب بوابة زين كاش بعد التفعيل', 'Per Zain Cash gateway once enabled', false, true, 'pending', 10),
    ('stripe_card', 'IQ', 'IQD', false, 5::numeric, 100000::numeric, 2.9::numeric, 0::numeric,
     'غير متاح حتى موافقة Stripe على نشاط الأصول الرقمية', 'Unavailable until Stripe crypto approval', false, true, 'pending', 20),
    ('bank_transfer', 'IQ', 'IQD', true, 50000::numeric, 100000000::numeric, 0::numeric, 0::numeric,
     'مراجعة بشرية بعد رفع الإثبات', 'Human review after proof upload', true, false, 'not_required', 30),
    ('manual_proof', 'IQ', 'IQD', true, 10000::numeric, 100000000::numeric, 0::numeric, 0::numeric,
     'مراجعة بشرية', 'Human review', true, false, 'not_required', 40),
    -- UAE
    ('stripe_card', 'AE', 'AED', false, 10::numeric, 200000::numeric, 2.9::numeric, 0::numeric,
     'غير متاح حتى موافقة Stripe', 'Unavailable until Stripe approval', false, true, 'pending', 10),
    ('eand_money', 'AE', 'AED', true, 50::numeric, 50000::numeric, 0::numeric, 0::numeric,
     'يدوي — رفع إثبات', 'Manual — proof upload', true, false, 'not_required', 20),
    ('dupay', 'AE', 'AED', true, 50::numeric, 50000::numeric, 0::numeric, 0::numeric,
     'يدوي — رفع إثبات', 'Manual — proof upload', true, false, 'not_required', 30),
    ('bank_transfer', 'AE', 'AED', true, 100::numeric, 500000::numeric, 0::numeric, 0::numeric,
     'مراجعة بشرية بعد التحويل', 'Human review after transfer', true, false, 'not_required', 40),
    ('manual_proof', 'AE', 'AED', true, 50::numeric, 500000::numeric, 0::numeric, 0::numeric,
     'مراجعة بشرية', 'Human review', true, false, 'not_required', 50),
    -- Rest of configured countries: bank + manual + stripe gated
    ('stripe_card', 'SA', 'SAR', false, 10::numeric, 200000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'SA', 'SAR', true, 100::numeric, 500000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'SA', 'SAR', true, 50::numeric, 500000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30),
    ('stripe_card', 'QA', 'QAR', false, 10::numeric, 200000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'QA', 'QAR', true, 100::numeric, 500000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'QA', 'QAR', true, 50::numeric, 500000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30),
    ('stripe_card', 'KW', 'KWD', false, 5::numeric, 50000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'KW', 'KWD', true, 20::numeric, 100000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'KW', 'KWD', true, 10::numeric, 100000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30),
    ('stripe_card', 'BH', 'BHD', false, 5::numeric, 50000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'BH', 'BHD', true, 20::numeric, 100000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'BH', 'BHD', true, 10::numeric, 100000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30),
    ('stripe_card', 'OM', 'OMR', false, 5::numeric, 50000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'OM', 'OMR', true, 20::numeric, 100000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'OM', 'OMR', true, 10::numeric, 100000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30),
    ('stripe_card', 'US', 'USD', false, 10::numeric, 50000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'US', 'USD', true, 50::numeric, 250000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'US', 'USD', true, 25::numeric, 250000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30),
    ('stripe_card', 'GB', 'GBP', false, 10::numeric, 50000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'GB', 'GBP', true, 50::numeric, 250000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'GB', 'GBP', true, 25::numeric, 250000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30),
    ('stripe_card', 'EU', 'EUR', false, 10::numeric, 50000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'EU', 'EUR', true, 50::numeric, 250000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'EU', 'EUR', true, 25::numeric, 250000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30),
    ('stripe_card', 'OTHER', 'USD', false, 10::numeric, 50000::numeric, 2.9::numeric, 0::numeric, 'بانتظار موافقة Stripe', 'Pending Stripe approval', false, true, 'pending', 10),
    ('bank_transfer', 'OTHER', 'USD', true, 50::numeric, 250000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 20),
    ('manual_proof', 'OTHER', 'USD', true, 25::numeric, 250000::numeric, 0::numeric, 0::numeric, 'مراجعة بشرية', 'Human review', true, false, 'not_required', 30)
) as seed(code, country_code, currency_code, enabled, min_amount, max_amount, percentage_fee, flat_fee, settlement_ar, settlement_en, requires_proof, requires_redirect, approval, sort_order)
  on pm.code = seed.code
on conflict (payment_method_id, country_code, currency_code) do nothing;

-- ---------------------------------------------------------------------------
-- Bank accounts (admin-configured; revealed only after valid order)
-- ---------------------------------------------------------------------------
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_holder text not null,
  iban text,
  account_number text,
  swift text,
  currency_code text not null check (char_length(currency_code) = 3),
  country_code text not null references public.countries(code),
  branch text,
  instructions_ar text,
  instructions_en text,
  min_amount numeric(18,2),
  max_amount numeric(18,2),
  enabled boolean not null default false,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','rejected')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bank_accounts_updated_at before update on public.bank_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Manual wallet provider configs (e& money / du Pay)
-- ---------------------------------------------------------------------------
create table if not exists public.manual_wallet_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique check (provider_key in ('eand_money','dupay')),
  mode text not null default 'manual' check (mode in ('manual','api')),
  request_phone text,
  qr_image_url text,
  reference_instructions_ar text,
  reference_instructions_en text,
  request_ttl_seconds int not null default 1800 check (request_ttl_seconds between 300 and 86400),
  min_amount numeric(18,2),
  max_amount numeric(18,2),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger manual_wallet_provider_configs_updated_at before update on public.manual_wallet_provider_configs
  for each row execute function public.set_updated_at();

insert into public.manual_wallet_provider_configs (provider_key, mode, enabled, reference_instructions_ar, reference_instructions_en)
values
  ('eand_money', 'manual', false,
   'ادفع المبلغ إلى رقم e& money المعتمد من الإدارة، واكتب مرجع الطلب، ثم ارفع الإثبات.',
   'Pay the amount to the admin-approved e& money number, include the order reference, then upload proof.'),
  ('dupay', 'manual', false,
   'ادفع المبلغ عبر du Pay وفق تعليمات الإدارة فقط، ثم ارفع الإثبات. لا يوجد تكامل تلقائي.',
   'Pay via du Pay using admin instructions only, then upload proof. No automatic integration.')
on conflict (provider_key) do nothing;

-- ---------------------------------------------------------------------------
-- Orders: country + payment provider tracking
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists country_code text references public.countries(code),
  add column if not exists payment_provider text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_payment_status text,
  add column if not exists payment_reference text,
  add column if not exists quote_link_id uuid,
  add column if not exists wallet_confirmed_at timestamptz,
  add column if not exists fulfillment_tx_hash text,
  add column if not exists fulfillment_network text,
  add column if not exists fulfillment_sent_amount numeric(36,18),
  add column if not exists fulfillment_confirmed_at timestamptz,
  add column if not exists fulfillment_confirmed_by uuid references auth.users(id);

create index if not exists orders_country_code_idx on public.orders(country_code);
create index if not exists orders_provider_payment_id_idx on public.orders(provider_payment_id);
create unique index if not exists orders_payment_reference_uidx
  on public.orders(payment_reference) where payment_reference is not null;

-- ---------------------------------------------------------------------------
-- Quote links (Gulf Gate Secure Quote Link)
-- ---------------------------------------------------------------------------
create table if not exists public.quote_links (
  id uuid primary key default gen_random_uuid(),
  public_token_hash text not null unique,
  token_hint text not null,
  customer_id uuid references auth.users(id),
  customer_name text,
  customer_email text,
  customer_phone text,
  country_code text not null references public.countries(code),
  fiat_currency text not null,
  fiat_amount numeric(18,2) not null check (fiat_amount > 0),
  usdt_amount numeric(36,18) not null check (usdt_amount > 0),
  amount_basis text not null default 'fiat' check (amount_basis in ('fiat','usdt')),
  network text not null check (network in ('TRC20','ERC20','BEP20')),
  wallet_mode text not null default 'customer_entered' check (wallet_mode in ('customer_entered','fixed')),
  fixed_wallet_address_encrypted text,
  rate_snapshot_id uuid,
  market_rate numeric(36,18) not null,
  spread_bps int not null default 0,
  fee_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null,
  customer_rate numeric(36,18) not null,
  allowed_payment_methods text[] not null default '{}',
  kyc_required boolean not null default false,
  expires_at timestamptz not null,
  rate_expires_at timestamptz not null,
  max_uses int not null default 1 check (max_uses between 1 and 100),
  used_count int not null default 0,
  single_use boolean not null default true,
  status text not null default 'active'
    check (status in ('active','expired','revoked','exhausted','completed')),
  notes text,
  legal_disclaimer_version text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger quote_links_updated_at before update on public.quote_links
  for each row execute function public.set_updated_at();

alter table public.orders
  drop constraint if exists orders_quote_link_id_fkey;
alter table public.orders
  add constraint orders_quote_link_id_fkey
  foreign key (quote_link_id) references public.quote_links(id);

create table if not exists public.quote_link_access_logs (
  id uuid primary key default gen_random_uuid(),
  quote_link_id uuid references public.quote_links(id) on delete set null,
  token_hint text,
  ip_hash text,
  user_agent_hash text,
  result text not null check (result in ('ok','not_found','expired','revoked','exhausted','rate_limited','invalid')),
  created_at timestamptz not null default now()
);

create table if not exists public.quote_link_events (
  id uuid primary key default gen_random_uuid(),
  quote_link_id uuid not null references public.quote_links(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quote_link_access_logs_link_idx on public.quote_link_access_logs(quote_link_id, created_at desc);
create index if not exists quote_link_events_link_idx on public.quote_link_events(quote_link_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Market / FX / quote rate locks
-- ---------------------------------------------------------------------------
create table if not exists public.market_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  symbol text not null,
  price numeric(36,18) not null check (price > 0),
  currency text not null default 'USD',
  fetched_at timestamptz not null default now(),
  provider_timestamp timestamptz,
  status text not null default 'live' check (status in ('live','derived','stale','failed')),
  raw_response_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.fx_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  base_currency text not null,
  quote_currency text not null,
  rate numeric(36,18) not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  provider_timestamp timestamptz,
  status text not null default 'live' check (status in ('live','derived','stale','failed')),
  raw_response_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_rate_locks (
  id uuid primary key default gen_random_uuid(),
  quote_link_id uuid references public.quote_links(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  market_rate numeric(36,18) not null,
  spread_bps int not null default 0,
  provider_fee numeric(18,2) not null default 0,
  service_fee numeric(18,2) not null default 0,
  customer_rate numeric(36,18) not null,
  fiat_currency text not null,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','consumed','superseded'))
);

create index if not exists market_price_snapshots_symbol_idx on public.market_price_snapshots(symbol, fetched_at desc);
create index if not exists fx_rate_snapshots_pair_idx on public.fx_rate_snapshots(base_currency, quote_currency, fetched_at desc);

-- ---------------------------------------------------------------------------
-- Risk rules + assessments (human review always possible)
-- ---------------------------------------------------------------------------
create table if not exists public.risk_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  rule_type text not null,
  threshold jsonb not null default '{}'::jsonb,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  enabled boolean not null default true,
  auto_reject boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger risk_rules_updated_at before update on public.risk_rules
  for each row execute function public.set_updated_at();

create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  quote_link_id uuid references public.quote_links(id) on delete set null,
  score int not null default 0,
  level text not null default 'low' check (level in ('low','medium','high','critical')),
  triggered_rules text[] not null default '{}',
  summary_ar text,
  summary_en text,
  requires_human_review boolean not null default true,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision text check (decision is null or decision in ('clear','hold','escalate','reject_recommended')),
  created_at timestamptz not null default now()
);

insert into public.risk_rules (code, name_ar, name_en, rule_type, threshold, severity, enabled, auto_reject) values
  ('high_amount', 'مبلغ مرتفع', 'High amount', 'amount_threshold', '{"usd":10000}'::jsonb, 'high', true, false),
  ('high_risk_country', 'دولة عالية المخاطر', 'High-risk country', 'country_risk', '{"levels":["high","blocked"]}'::jsonb, 'high', true, false),
  ('velocity_burst', 'طلبات متكررة', 'Order velocity', 'velocity', '{"count":5,"window_minutes":60}'::jsonb, 'medium', true, false),
  ('wallet_change_after_pay', 'تغيير محفظة بعد الدفع', 'Wallet change after payment', 'wallet_change', '{}'::jsonb, 'critical', true, false),
  ('name_mismatch', 'اختلاف اسم الدافع', 'Payer name mismatch', 'name_mismatch', '{}'::jsonb, 'medium', true, false)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Payment webhook events (idempotent ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  signature_valid boolean not null default false,
  processing_status text not null default 'received'
    check (processing_status in ('received','processing','processed','failed','dead_letter','ignored')),
  attempts int not null default 0,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text,
  order_id uuid references public.orders(id),
  unique (provider, external_event_id)
);

create index if not exists payment_webhook_events_status_idx
  on public.payment_webhook_events(processing_status, received_at desc);

-- ---------------------------------------------------------------------------
-- Provider payment attempts
-- ---------------------------------------------------------------------------
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  idempotency_key text not null unique,
  provider_payment_id text,
  status text not null default 'created'
    check (status in (
      'created','redirected','pending','authentication_required','paid','failed',
      'expired','refunded','under_review'
    )),
  amount numeric(18,2) not null,
  currency text not null,
  redirect_url text,
  raw_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payment_attempts_updated_at before update on public.payment_attempts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Expand transition_order for new statuses (still blocks processing/completed/fulfilled without live trading)
-- ---------------------------------------------------------------------------
create or replace function public.transition_order(order_id uuid, new_status public.order_status, note text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_status public.order_status;
begin
  perform public.require_staff_aal2();
  if not public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  select status into current_status from public.orders where id = order_id for update;
  if current_status is null then raise exception 'NOT_FOUND'; end if;

  if not (
    (current_status = 'draft' and new_status in ('quote_created','awaiting_kyc','awaiting_payment','awaiting_customer','cancelled','expired')) or
    (current_status = 'quote_created' and new_status in ('awaiting_customer','awaiting_payment','kyc_required','expired','cancelled')) or
    (current_status = 'awaiting_customer' and new_status in ('awaiting_payment','payment_pending','expired','cancelled')) or
    (current_status = 'awaiting_kyc' and new_status in ('awaiting_payment','kyc_required','cancelled','rejected')) or
    (current_status = 'kyc_required' and new_status in ('awaiting_payment','compliance_review','cancelled','rejected')) or
    (current_status = 'awaiting_payment' and new_status in ('payment_pending','proof_uploaded','payment_received_pending_review','cancelled','expired')) or
    (current_status = 'payment_pending' and new_status in ('payment_received_pending_review','proof_uploaded','cancelled','expired','under_review','disputed')) or
    (current_status = 'proof_uploaded' and new_status in ('under_review','payment_received_pending_review','awaiting_payment','compliance_hold','compliance_review')) or
    (current_status = 'payment_received_pending_review' and new_status in ('under_review','compliance_review','compliance_hold','kyc_required','approved_for_fulfillment','rejected','refund_required','disputed')) or
    (current_status = 'under_review' and new_status in ('payment_confirmed','payment_received_pending_review','compliance_hold','compliance_review','rejected','refund_required','disputed')) or
    (current_status = 'payment_confirmed' and new_status in ('approved','approved_for_fulfillment','compliance_hold','compliance_review','refund_required')) or
    (current_status = 'compliance_hold' and new_status in ('under_review','compliance_review','approved','approved_for_fulfillment','rejected','refund_required')) or
    (current_status = 'compliance_review' and new_status in ('under_review','approved_for_fulfillment','rejected','refund_required','disputed')) or
    (current_status = 'approved' and new_status in ('approved_for_fulfillment','processing','fulfilment_in_progress','cancelled','refund_required')) or
    (current_status = 'approved_for_fulfillment' and new_status in ('fulfillment_in_progress','processing','cancelled','refund_required')) or
    (current_status = 'fulfillment_in_progress' and new_status in ('fulfilled','completed','compliance_hold','refund_required','disputed')) or
    (current_status = 'processing' and new_status in ('completed','fulfilled','refund_required','compliance_hold')) or
    (current_status = 'disputed' and new_status in ('under_review','compliance_review','refunded','rejected','cancelled')) or
    (current_status = 'refund_required' and new_status in ('refunded','cancelled','completed'))
  ) then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  -- Hard lock: never auto-complete settlement without live trading + human fulfillment fields
  if not public.is_live_trading() and new_status in ('processing','completed','fulfilled','fulfillment_in_progress','approved_for_fulfillment') then
    raise exception 'LIVE_TRADING_DISABLED';
  end if;
  if new_status = 'payment_confirmed' and not public.has_staff_role(array['super_admin','finance']::public.staff_role[]) then
    raise exception 'FINANCE_ROLE_REQUIRED';
  end if;
  if new_status in ('compliance_hold','compliance_review') and not public.has_staff_role(array['super_admin','compliance']::public.staff_role[]) then
    raise exception 'COMPLIANCE_ROLE_REQUIRED';
  end if;
  if new_status in ('fulfilled','completed') then
    if (select fulfillment_tx_hash from public.orders where id = order_id) is null then
      raise exception 'FULFILLMENT_TX_HASH_REQUIRED';
    end if;
  end if;

  update public.orders
  set status = new_status,
      internal_note = coalesce(left(note,2000), internal_note)
  where id = order_id;
  return true;
end;
$$;

-- Soft helper: mark payment received pending review from trusted server (service role / webhook path)
create or replace function public.mark_payment_received_pending_review(
  _order_id uuid,
  _provider text,
  _provider_payment_id text,
  _note text default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare current_status public.order_status;
begin
  if auth.role() <> 'service_role' and not public.has_staff_role(array['super_admin','finance','operations']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  select status into current_status from public.orders where id = _order_id for update;
  if current_status is null then raise exception 'NOT_FOUND'; end if;
  if current_status not in ('awaiting_payment','payment_pending','proof_uploaded','under_review') then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;
  update public.orders set
    status = 'payment_received_pending_review',
    payment_provider = coalesce(_provider, payment_provider),
    provider_payment_id = coalesce(_provider_payment_id, provider_payment_id),
    provider_payment_status = 'paid',
    internal_note = coalesce(left(_note,2000), internal_note)
  where id = _order_id;
  return true;
end;
$$;

revoke all on function public.mark_payment_received_pending_review(uuid, text, text, text) from public;
grant execute on function public.mark_payment_received_pending_review(uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.countries enable row level security;
alter table public.payment_method_availability enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.manual_wallet_provider_configs enable row level security;
alter table public.quote_links enable row level security;
alter table public.quote_link_access_logs enable row level security;
alter table public.quote_link_events enable row level security;
alter table public.market_price_snapshots enable row level security;
alter table public.fx_rate_snapshots enable row level security;
alter table public.quote_rate_locks enable row level security;
alter table public.risk_rules enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.payment_attempts enable row level security;

drop policy if exists countries_public_select on public.countries;
create policy countries_public_select on public.countries
  for select using (enabled = true and sanctions_blocked = false);

drop policy if exists countries_admin_all on public.countries;
create policy countries_admin_all on public.countries
  for all using (public.has_staff_role(array['super_admin','finance','compliance']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','finance','compliance']::public.staff_role[]));

drop policy if exists payment_method_availability_public_select on public.payment_method_availability;
create policy payment_method_availability_public_select on public.payment_method_availability
  for select using (
    enabled = true
    and exists (
      select 1 from public.countries c
      where c.code = country_code and c.enabled and not c.sanctions_blocked
    )
  );

drop policy if exists payment_method_availability_admin_all on public.payment_method_availability;
create policy payment_method_availability_admin_all on public.payment_method_availability
  for all using (public.has_staff_role(array['super_admin','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));

drop policy if exists bank_accounts_staff_select on public.bank_accounts;
create policy bank_accounts_staff_select on public.bank_accounts
  for select using (public.has_staff_role(array['super_admin','finance','operations']::public.staff_role[]));

drop policy if exists bank_accounts_admin_all on public.bank_accounts;
create policy bank_accounts_admin_all on public.bank_accounts
  for all using (public.has_staff_role(array['super_admin','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));

drop policy if exists manual_wallet_configs_staff on public.manual_wallet_provider_configs;
create policy manual_wallet_configs_staff on public.manual_wallet_provider_configs
  for all using (public.has_staff_role(array['super_admin','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));

drop policy if exists quote_links_staff_all on public.quote_links;
create policy quote_links_staff_all on public.quote_links
  for all using (public.has_staff_role(array['super_admin','operations','finance','support']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','operations','finance']::public.staff_role[]));

drop policy if exists quote_links_customer_select on public.quote_links;
create policy quote_links_customer_select on public.quote_links
  for select using (customer_id is not null and customer_id = (select auth.uid()));

drop policy if exists quote_link_access_logs_staff on public.quote_link_access_logs;
create policy quote_link_access_logs_staff on public.quote_link_access_logs
  for select using (public.has_staff_role(array['super_admin','operations','compliance']::public.staff_role[]));

drop policy if exists quote_link_events_staff on public.quote_link_events;
create policy quote_link_events_staff on public.quote_link_events
  for select using (public.has_staff_role(array['super_admin','operations','compliance','finance']::public.staff_role[]));

drop policy if exists market_price_snapshots_public_select on public.market_price_snapshots;
create policy market_price_snapshots_public_select on public.market_price_snapshots
  for select using (true);

drop policy if exists fx_rate_snapshots_public_select on public.fx_rate_snapshots;
create policy fx_rate_snapshots_public_select on public.fx_rate_snapshots
  for select using (true);

drop policy if exists market_price_snapshots_staff_write on public.market_price_snapshots;
create policy market_price_snapshots_staff_write on public.market_price_snapshots
  for insert with check (public.has_staff_role(array['super_admin','finance','operations']::public.staff_role[]));

drop policy if exists fx_rate_snapshots_staff_write on public.fx_rate_snapshots;
create policy fx_rate_snapshots_staff_write on public.fx_rate_snapshots
  for insert with check (public.has_staff_role(array['super_admin','finance','operations']::public.staff_role[]));

drop policy if exists quote_rate_locks_staff on public.quote_rate_locks;
create policy quote_rate_locks_staff on public.quote_rate_locks
  for all using (public.has_staff_role(array['super_admin','operations','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','operations','finance']::public.staff_role[]));

drop policy if exists risk_rules_staff on public.risk_rules;
create policy risk_rules_staff on public.risk_rules
  for all using (public.has_staff_role(array['super_admin','compliance']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','compliance']::public.staff_role[]));

drop policy if exists risk_assessments_staff on public.risk_assessments;
create policy risk_assessments_staff on public.risk_assessments
  for all using (public.has_staff_role(array['super_admin','compliance','operations','reviewer']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','compliance','operations','reviewer']::public.staff_role[]));

drop policy if exists payment_webhook_events_staff on public.payment_webhook_events;
create policy payment_webhook_events_staff on public.payment_webhook_events
  for select using (public.has_staff_role(array['super_admin','finance','compliance']::public.staff_role[]));

drop policy if exists payment_attempts_owner_select on public.payment_attempts;
create policy payment_attempts_owner_select on public.payment_attempts
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

drop policy if exists payment_attempts_staff_select on public.payment_attempts;
create policy payment_attempts_staff_select on public.payment_attempts
  for select using (public.has_staff_role(array['super_admin','operations','finance','compliance','reviewer']::public.staff_role[]));

-- Audit critical tables
drop trigger if exists audit_countries on public.countries;
create trigger audit_countries after insert or update or delete on public.countries
  for each row execute function public.audit_critical_change();

drop trigger if exists audit_payment_method_availability on public.payment_method_availability;
create trigger audit_payment_method_availability after insert or update or delete on public.payment_method_availability
  for each row execute function public.audit_critical_change();

drop trigger if exists audit_bank_accounts on public.bank_accounts;
create trigger audit_bank_accounts after insert or update or delete on public.bank_accounts
  for each row execute function public.audit_critical_change();

drop trigger if exists audit_quote_links on public.quote_links;
create trigger audit_quote_links after insert or update or delete on public.quote_links
  for each row execute function public.audit_critical_change();

-- Feature flags / readiness markers (defaults locked)
insert into public.feature_flags (key, enabled, description, legal_reference) values
  ('real_payments', false, 'Allows initiating real provider checkouts when credentials + approvals exist', null),
  ('auto_fulfillment', false, 'HARD LOCK — automatic USDT send is forbidden in this phase', 'blocked-pre-license'),
  ('stripe_crypto', false, 'Stripe only after official crypto business-model approval', null),
  ('zaincash_payments', false, 'Zain Cash merchant gateway — enable after UAT + production credentials', null),
  ('quote_links', true, 'Secure quote link intake for customers', null)
on conflict (key) do update set description = excluded.description;

update public.site_settings
set value = 'false'::jsonb, updated_at = now()
where key = 'live_trading';

insert into public.site_settings (key, value)
values
  ('schema_migration_marker', '"202607150014"'::jsonb),
  ('auto_fulfillment_enabled', 'false'::jsonb),
  ('real_payments_enabled', 'false'::jsonb),
  ('stripe_crypto_approved', 'false'::jsonb),
  ('quote_default_expiry_seconds', '300'::jsonb),
  ('proof_intake_default', 'true'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

comment on table public.countries is 'Customer country catalog for payment routing. Sanctions-blocked countries cannot create orders.';
comment on table public.payment_method_availability is 'Country×method matrix — never hardcode methods in JSX alone.';
comment on table public.quote_links is 'Gulf Gate Secure Quote Links. Token hash only; no sensitive data in URL.';
comment on table public.payment_webhook_events is 'Idempotent payment webhook ledger. Webhook is source of truth — not client redirects.';
comment on function public.mark_payment_received_pending_review is 'Sets payment_received_pending_review only. Never marks completed/fulfilled.';
comment on function public.transition_order is 'Staff order transitions. Fulfillment/completed remain locked without live trading + tx hash.';
