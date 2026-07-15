-- Gulf Gate initial schema
-- Pre-launch invariant: financial execution is disabled at database level.

create extension if not exists pgcrypto;

create type public.account_type as enum ('individual', 'business');
create type public.kyc_status as enum ('not_started', 'draft', 'submitted', 'under_review', 'resubmission_required', 'approved', 'rejected', 'expired');
create type public.staff_role as enum ('super_admin', 'operations', 'compliance', 'finance', 'support', 'reviewer');
create type public.order_type as enum ('buy', 'sell', 'p2p');
create type public.order_status as enum ('draft', 'awaiting_kyc', 'awaiting_payment', 'proof_uploaded', 'under_review', 'payment_confirmed', 'compliance_hold', 'approved', 'processing', 'completed', 'cancelled', 'rejected', 'refund_required');
create type public.proof_status as enum ('uploaded', 'under_review', 'approved', 'rejected', 'resubmission_required');
create type public.document_kind as enum ('national_id_front', 'national_id_back', 'passport', 'selfie', 'proof_of_address', 'source_of_funds', 'business_registration', 'ubo_document', 'other');
create type public.document_status as enum ('uploaded', 'accepted', 'rejected', 'resubmission_required');
create type public.ticket_status as enum ('open', 'waiting_customer', 'waiting_staff', 'resolved', 'closed');
create type public.p2p_side as enum ('buy', 'sell');
create type public.p2p_trade_status as enum ('open', 'payment_pending', 'proof_uploaded', 'under_review', 'disputed', 'approved', 'released', 'cancelled');
create type public.dispute_status as enum ('open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved_buyer', 'resolved_seller', 'closed');
create type public.alert_severity as enum ('low', 'medium', 'high', 'critical');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type public.account_type not null default 'individual',
  display_name text,
  legal_name text,
  phone text,
  country_code text,
  city text,
  preferred_locale text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  terms_accepted_at timestamptz,
  terms_version text,
  login_alerts_enabled boolean not null default true,
  merchant_rating numeric(3,2) not null default 0 check (merchant_rating between 0 and 5),
  merchant_completion_rate numeric(5,2) not null default 0 check (merchant_completion_rate between 0 and 100),
  merchant_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.kyc_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  account_type public.account_type not null,
  status public.kyc_status not null default 'draft',
  date_of_birth date,
  nationality text,
  residential_address jsonb not null default '{}'::jsonb,
  business_details jsonb not null default '{}'::jsonb,
  source_of_funds text,
  source_of_wealth text,
  transaction_purpose text,
  expected_monthly_volume numeric(20,2),
  reviewer_id uuid references public.profiles(id),
  review_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  kyc_case_id uuid not null references public.kyc_cases(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.document_kind not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text,
  status public.document_status not null default 'uploaded',
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  account_holder text,
  account_number_masked text,
  account_number_secret_ref text,
  qr_storage_path text,
  instructions_ar text,
  instructions_en text,
  min_amount numeric(20,2),
  max_amount numeric(20,2),
  supported_currencies text[] not null default array['USD']::text[],
  supported_cities text[] not null default '{}'::text[],
  active boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code in ('bank_transfer', 'fib', 'superqi', 'zain_cash', 'cash_representative', 'wallet_transfer')),
  check (min_amount is null or max_amount is null or min_amount <= max_amount)
);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  order_type public.order_type not null,
  fiat_currency text not null check (fiat_currency in ('USD', 'AED', 'IQD')),
  network text not null check (network in ('TRC20', 'ERC20')),
  reference_rate numeric(20,8),
  spread_bps integer not null default 0 check (spread_bps between 0 and 10000),
  flat_fee numeric(20,2) not null default 0,
  percentage_fee numeric(8,5) not null default 0,
  min_amount numeric(20,2) not null default 0,
  max_amount numeric(20,2),
  quote_ttl_seconds integer not null default 600 check (quote_ttl_seconds between 30 and 3600),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_type, fiat_currency, network)
);

create sequence public.order_reference_seq start 100000;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique default ('GG-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_reference_seq')::text, 6, '0')),
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_type public.order_type not null,
  status public.order_status not null default 'draft',
  fiat_currency text not null check (fiat_currency in ('USD', 'AED', 'IQD')),
  network text not null check (network in ('TRC20', 'ERC20')),
  wallet_address text,
  amount_fiat numeric(20,2) not null check (amount_fiat > 0),
  amount_usdt numeric(20,8),
  quote_rate numeric(20,8),
  fee_amount numeric(20,2) not null default 0,
  quote_expires_at timestamptz,
  payment_method_id uuid references public.payment_methods(id),
  transaction_purpose text,
  settlement_tx_hash text,
  settlement_at timestamptz,
  assigned_to uuid references public.profiles(id),
  risk_score integer check (risk_score between 0 and 100),
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_status_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  public_note text,
  internal_note text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text,
  transfer_reference text not null,
  sender_name text not null,
  amount numeric(20,2) not null check (amount > 0),
  payment_at timestamptz not null,
  status public.proof_status not null default 'uploaded',
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.p2p_offers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete restrict,
  side public.p2p_side not null,
  fiat_currency text not null check (fiat_currency in ('USD', 'AED', 'IQD')),
  network text not null check (network in ('TRC20', 'ERC20')),
  price numeric(20,8) not null check (price > 0),
  min_amount numeric(20,2) not null check (min_amount > 0),
  max_amount numeric(20,2) not null check (max_amount >= min_amount),
  available_usdt numeric(20,8) not null default 0,
  payment_method_ids uuid[] not null default '{}'::uuid[],
  payment_window_minutes integer not null default 30 check (payment_window_minutes between 5 and 180),
  terms_ar text,
  terms_en text,
  active boolean not null default false,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.p2p_trades (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique default ('P2P-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_reference_seq')::text, 6, '0')),
  offer_id uuid not null references public.p2p_offers(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  status public.p2p_trade_status not null default 'open',
  fiat_currency text not null check (fiat_currency in ('USD', 'AED', 'IQD')),
  network text not null check (network in ('TRC20', 'ERC20')),
  price numeric(20,8) not null,
  amount_fiat numeric(20,2) not null check (amount_fiat > 0),
  amount_usdt numeric(20,8) not null check (amount_usdt > 0),
  payment_method_id uuid references public.payment_methods(id),
  payment_deadline timestamptz not null,
  released_at timestamptz,
  released_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  p2p_trade_id uuid not null unique references public.p2p_trades(id) on delete restrict,
  opened_by uuid not null references public.profiles(id),
  status public.dispute_status not null default 'open',
  reason text not null,
  assigned_to uuid references public.profiles(id),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique default ('SUP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_reference_seq')::text, 6, '0')),
  user_id uuid not null references public.profiles(id) on delete restrict,
  subject text not null,
  category text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  message text not null,
  internal boolean not null default false,
  attachment_path text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_ar text not null,
  title_en text not null,
  body_ar text not null,
  body_en text not null,
  kind text not null default 'system',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.compliance_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  order_id uuid references public.orders(id),
  p2p_trade_id uuid references public.p2p_trades(id),
  severity public.alert_severity not null,
  rule_code text not null,
  title text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'investigating', 'cleared', 'escalated', 'reported')),
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  ip_hash text,
  user_agent text,
  request_id text,
  created_at timestamptz not null default now()
);

create table public.rate_limit_events (
  key_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key_hash, window_start)
);

insert into public.site_settings (key, value, description) values
  ('live_trading', 'false'::jsonb, 'Master financial execution feature flag. Must remain false before legal approval.'),
  ('prelaunch_notice', '{"ar":"نسخة ما قبل الإطلاق — لا يتم تنفيذ معاملات مالية حقيقية","en":"Pre-launch — no real financial transactions are executed"}'::jsonb, 'Public regulatory notice'),
  ('legal_approval_reference', 'null'::jsonb, 'Written legal approval reference required for activation');

insert into public.payment_methods (code, name_ar, name_en, supported_currencies, active, sort_order) values
  ('bank_transfer', 'تحويل مصرفي', 'Bank transfer', array['USD','AED','IQD'], false, 10),
  ('fib', 'مصرف FIB', 'FIB', array['USD','IQD'], false, 20),
  ('superqi', 'سوبر كي', 'SuperQi', array['IQD'], false, 30),
  ('zain_cash', 'زين كاش', 'Zain Cash', array['IQD'], false, 40),
  ('cash_representative', 'مندوب نقدي', 'Cash representative', array['USD','AED','IQD'], false, 50),
  ('wallet_transfer', 'تحويل محفظة', 'Wallet transfer', array['USD','AED','IQD'], false, 60);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger kyc_cases_updated_at before update on public.kyc_cases for each row execute function public.set_updated_at();
create trigger payment_methods_updated_at before update on public.payment_methods for each row execute function public.set_updated_at();
create trigger pricing_rules_updated_at before update on public.pricing_rules for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger p2p_offers_updated_at before update on public.p2p_offers for each row execute function public.set_updated_at();
create trigger p2p_trades_updated_at before update on public.p2p_trades for each row execute function public.set_updated_at();
create trigger support_tickets_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, phone, preferred_locale, terms_accepted_at, terms_version)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    new.phone,
    coalesce(new.raw_user_meta_data->>'preferred_locale', 'ar'),
    case when coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false) then now() else null end,
    new.raw_user_meta_data->>'terms_version'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.has_staff_role(allowed public.staff_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = (select auth.uid()) and role = any(allowed)
  );
$$;

create or replace function public.is_live_trading()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.site_settings where key = 'live_trading'), false);
$$;

create or replace function public.enforce_prelaunch_lock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_live_trading() then
    if new.status in ('processing', 'completed') or new.settlement_tx_hash is not null or new.settlement_at is not null then
      raise exception 'LIVE_TRADING_DISABLED: settlement and financial execution are locked';
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_prelaunch_lock before insert or update on public.orders for each row execute function public.enforce_prelaunch_lock();

create or replace function public.enforce_p2p_prelaunch_lock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_live_trading() and (new.status = 'released' or new.released_at is not null or new.released_by is not null) then
    raise exception 'LIVE_TRADING_DISABLED: automatic or manual crypto release is locked';
  end if;
  return new;
end;
$$;

create trigger p2p_prelaunch_lock before insert or update on public.p2p_trades for each row execute function public.enforce_p2p_prelaunch_lock();

create or replace function public.record_order_status_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.order_status_events (order_id, from_status, to_status, actor_id)
    values (new.id, case when tg_op = 'UPDATE' then old.status else null end, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_status_event after insert or update of status on public.orders for each row execute function public.record_order_status_event();

create or replace function public.mark_order_proof_uploaded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.orders
  set status = 'proof_uploaded'
  where id = new.order_id and user_id = new.user_id and status = 'awaiting_payment';
  return new;
end;
$$;

create trigger payment_proof_updates_order after insert on public.payment_proofs for each row execute function public.mark_order_proof_uploaded();

create or replace function public.protect_audit_logs()
returns trigger language plpgsql as $$
begin raise exception 'Audit logs are immutable'; end;
$$;

create trigger audit_logs_immutable before update or delete on public.audit_logs for each row execute function public.protect_audit_logs();

create or replace function public.audit_critical_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare entity text; row_data jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  entity := coalesce(row_data->>'id', row_data->>'user_id', row_data->>'key', 'unknown');
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  values (auth.uid(), auth.jwt()->>'aal', lower(tg_op), tg_table_name, entity,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger audit_kyc after insert or update or delete on public.kyc_cases for each row execute function public.audit_critical_change();
create trigger audit_orders after insert or update or delete on public.orders for each row execute function public.audit_critical_change();
create trigger audit_proofs after insert or update or delete on public.payment_proofs for each row execute function public.audit_critical_change();
create trigger audit_payment_methods after insert or update or delete on public.payment_methods for each row execute function public.audit_critical_change();
create trigger audit_p2p after insert or update or delete on public.p2p_trades for each row execute function public.audit_critical_change();
create trigger audit_staff_roles after insert or update or delete on public.staff_roles for each row execute function public.audit_critical_change();

create or replace function public.set_live_trading(enabled boolean, legal_reference text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.has_staff_role(array['super_admin']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then raise exception 'MFA_REQUIRED'; end if;
  if enabled and (legal_reference is null or length(trim(legal_reference)) < 12) then raise exception 'LEGAL_APPROVAL_REFERENCE_REQUIRED'; end if;

  update public.site_settings set value = to_jsonb(enabled), updated_by = auth.uid(), updated_at = now() where key = 'live_trading';
  update public.site_settings set value = to_jsonb(legal_reference), updated_by = auth.uid(), updated_at = now() where key = 'legal_approval_reference';
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, new_data)
  values (auth.uid(), 'super_admin', case when enabled then 'activate_live_trading' else 'deactivate_live_trading' end, 'site_settings', 'live_trading', jsonb_build_object('enabled', enabled, 'legal_reference', legal_reference));
  return enabled;
end;
$$;

create or replace function public.check_rate_limit(input_key text, max_hits integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare bucket timestamptz; current_hits integer;
begin
  if max_hits < 1 or window_seconds < 1 then raise exception 'INVALID_RATE_LIMIT'; end if;
  bucket := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into public.rate_limit_events (key_hash, window_start, hits)
  values (encode(digest(input_key, 'sha256'), 'hex'), bucket, 1)
  on conflict (key_hash, window_start) do update set hits = public.rate_limit_events.hits + 1
  returning hits into current_hits;
  return current_hits <= max_hits;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.kyc_cases enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.payment_methods enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.orders enable row level security;
alter table public.order_status_events enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.p2p_offers enable row level security;
alter table public.p2p_trades enable row level security;
alter table public.disputes enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.compliance_alerts enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limit_events enable row level security;

create policy profiles_self_select on public.profiles for select using (id = (select auth.uid()) or public.has_staff_role(array['super_admin','operations','compliance','finance','support','reviewer']::public.staff_role[]));
create policy profiles_self_update on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy staff_roles_self_or_admin_select on public.staff_roles for select using (user_id = (select auth.uid()) or public.has_staff_role(array['super_admin']::public.staff_role[]));
create policy staff_roles_super_admin_all on public.staff_roles for all using (public.has_staff_role(array['super_admin']::public.staff_role[])) with check (public.has_staff_role(array['super_admin']::public.staff_role[]));

create policy kyc_owner_select on public.kyc_cases for select using (user_id = (select auth.uid()));
create policy kyc_owner_insert on public.kyc_cases for insert with check (user_id = (select auth.uid()) and status = 'draft' and reviewer_id is null and review_notes is null and reviewed_at is null);
create policy kyc_owner_update on public.kyc_cases for update using (user_id = (select auth.uid()) and status in ('draft','resubmission_required')) with check (user_id = (select auth.uid()) and status in ('draft','submitted') and reviewer_id is null and reviewed_at is null);
create policy kyc_staff_all on public.kyc_cases for all using (public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]));
create policy kyc_documents_owner_select on public.kyc_documents for select using (user_id = (select auth.uid()));
create policy kyc_documents_owner_insert on public.kyc_documents for insert with check (user_id = (select auth.uid()) and status = 'uploaded' and reviewer_note is null and reviewed_at is null);
create policy kyc_documents_staff_all on public.kyc_documents for all using (public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]));

create policy payment_methods_active_select on public.payment_methods for select using (active or public.has_staff_role(array['super_admin','operations','finance']::public.staff_role[]));
create policy payment_methods_admin_all on public.payment_methods for all using (public.has_staff_role(array['super_admin','finance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));
create policy pricing_active_select on public.pricing_rules for select using (active or public.has_staff_role(array['super_admin','operations','finance']::public.staff_role[]));
create policy pricing_admin_all on public.pricing_rules for all using (public.has_staff_role(array['super_admin','finance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));

create policy orders_owner_select on public.orders for select using (user_id = (select auth.uid()));
create policy orders_owner_insert on public.orders for insert with check (user_id = (select auth.uid()) and status in ('draft','awaiting_kyc') and settlement_tx_hash is null and settlement_at is null and assigned_to is null and risk_score is null and internal_note is null);
create policy orders_owner_update_draft on public.orders for update using (user_id = (select auth.uid()) and status = 'draft') with check (user_id = (select auth.uid()) and status in ('draft','cancelled') and settlement_tx_hash is null and settlement_at is null and assigned_to is null and risk_score is null and internal_note is null);
create policy orders_staff_all on public.orders for all using (public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]));
create policy order_events_owner_select on public.order_status_events for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy order_events_staff_select on public.order_status_events for select using (public.has_staff_role(array['super_admin','operations','compliance','finance','support','reviewer']::public.staff_role[]));
create policy proofs_owner_select on public.payment_proofs for select using (user_id = (select auth.uid()));
create policy proofs_owner_insert on public.payment_proofs for insert with check (user_id = (select auth.uid()) and status = 'uploaded' and reviewer_id is null and reviewer_note is null and reviewed_at is null and exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy proofs_staff_all on public.payment_proofs for all using (public.has_staff_role(array['super_admin','operations','finance','reviewer']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','operations','finance','reviewer']::public.staff_role[]));

create policy p2p_offers_public_select on public.p2p_offers for select using (active or merchant_id = (select auth.uid()) or public.has_staff_role(array['super_admin','operations','compliance']::public.staff_role[]));
create policy p2p_offers_owner_insert on public.p2p_offers for insert with check (merchant_id = (select auth.uid()) and active = false and approved_by is null and approved_at is null);
create policy p2p_offers_owner_update on public.p2p_offers for update using (merchant_id = (select auth.uid()) and active = false) with check (merchant_id = (select auth.uid()) and active = false and approved_by is null and approved_at is null);
create policy p2p_offers_staff_all on public.p2p_offers for all using (public.has_staff_role(array['super_admin','operations','compliance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','operations','compliance']::public.staff_role[]));
create policy p2p_trades_party_select on public.p2p_trades for select using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));
create policy p2p_trades_party_insert on public.p2p_trades for insert with check ((buyer_id = (select auth.uid()) or seller_id = (select auth.uid())) and status = 'open');
create policy p2p_trades_staff_all on public.p2p_trades for all using (public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]));
create policy disputes_party_select on public.disputes for select using (exists (select 1 from public.p2p_trades t where t.id = p2p_trade_id and ((select auth.uid()) in (t.buyer_id, t.seller_id))));
create policy disputes_party_insert on public.disputes for insert with check (opened_by = (select auth.uid()) and status = 'open' and assigned_to is null and resolution is null and exists (select 1 from public.p2p_trades t where t.id = p2p_trade_id and ((select auth.uid()) in (t.buyer_id, t.seller_id))));
create policy disputes_staff_all on public.disputes for all using (public.has_staff_role(array['super_admin','operations','compliance','support','reviewer']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','operations','compliance','support','reviewer']::public.staff_role[]));

create policy tickets_owner_select on public.support_tickets for select using (user_id = (select auth.uid()));
create policy tickets_owner_insert on public.support_tickets for insert with check (user_id = (select auth.uid()) and status = 'open' and priority = 'normal' and assigned_to is null);
create policy tickets_staff_all on public.support_tickets for all using (public.has_staff_role(array['super_admin','support','operations']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','support','operations']::public.staff_role[]));
create policy ticket_messages_participant_select on public.ticket_messages for select using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = (select auth.uid()) or public.has_staff_role(array['super_admin','support','operations']::public.staff_role[]))) and (not internal or public.has_staff_role(array['super_admin','support','operations']::public.staff_role[])));
create policy ticket_messages_participant_insert on public.ticket_messages for insert with check (author_id = (select auth.uid()) and (not internal or public.has_staff_role(array['super_admin','support','operations']::public.staff_role[])) and exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = (select auth.uid()) or public.has_staff_role(array['super_admin','support','operations']::public.staff_role[]))));
create policy notifications_owner_select on public.notifications for select using (user_id = (select auth.uid()));
create policy notifications_owner_update on public.notifications for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy alerts_staff_all on public.compliance_alerts for all using (public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]));
create policy settings_public_select on public.site_settings for select using (key in ('live_trading','prelaunch_notice'));
create policy settings_staff_select on public.site_settings for select using (public.has_staff_role(array['super_admin','operations','compliance','finance','support','reviewer']::public.staff_role[]));
create policy settings_admin_update_non_activation on public.site_settings for update using (key <> 'live_trading' and public.has_staff_role(array['super_admin']::public.staff_role[])) with check (key <> 'live_trading' and public.has_staff_role(array['super_admin']::public.staff_role[]));
create policy audit_logs_authorized_select on public.audit_logs for select using (public.has_staff_role(array['super_admin','compliance']::public.staff_role[]));

grant execute on function public.has_staff_role(public.staff_role[]) to authenticated;
grant execute on function public.is_live_trading() to anon, authenticated;
grant execute on function public.set_live_trading(boolean, text) to authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;
revoke insert, update, delete on public.audit_logs from anon, authenticated;
revoke update on public.profiles from authenticated;
grant update (account_type, display_name, legal_name, phone, country_code, city, preferred_locale, login_alerts_enabled) on public.profiles to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Private storage buckets and policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('kyc-documents', 'kyc-documents', false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('payment-proofs', 'payment-proofs', false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('payment-method-qr', 'payment-method-qr', false, 5242880, array['image/jpeg','image/png'])
on conflict (id) do nothing;

create policy storage_owner_insert on storage.objects for insert to authenticated
with check (bucket_id in ('kyc-documents','payment-proofs') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_owner_select on storage.objects for select to authenticated
using (bucket_id in ('kyc-documents','payment-proofs') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_owner_update on storage.objects for update to authenticated
using (bucket_id in ('kyc-documents','payment-proofs') and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id in ('kyc-documents','payment-proofs') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_staff_select on storage.objects for select to authenticated
using (
  (bucket_id = 'kyc-documents' and public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]))
  or (bucket_id = 'payment-proofs' and public.has_staff_role(array['super_admin','operations','finance','reviewer']::public.staff_role[]))
  or (bucket_id = 'payment-method-qr' and public.has_staff_role(array['super_admin','finance','operations']::public.staff_role[]))
);
create policy storage_payment_qr_admin_all on storage.objects for all to authenticated
using (bucket_id = 'payment-method-qr' and public.has_staff_role(array['super_admin','finance']::public.staff_role[]))
with check (bucket_id = 'payment-method-qr' and public.has_staff_role(array['super_admin','finance']::public.staff_role[]));

create index profiles_phone_idx on public.profiles(phone);
create index kyc_cases_status_idx on public.kyc_cases(status, updated_at desc);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index order_events_order_idx on public.order_status_events(order_id, created_at);
create index payment_proofs_order_idx on public.payment_proofs(order_id, created_at desc);
create index p2p_offers_market_idx on public.p2p_offers(active, side, fiat_currency, network, price);
create index p2p_trades_party_idx on public.p2p_trades(buyer_id, seller_id, created_at desc);
create index notifications_user_idx on public.notifications(user_id, read_at, created_at desc);
create index alerts_status_idx on public.compliance_alerts(status, severity, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
