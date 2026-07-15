-- Gulf Gate platform completion migration.
-- Keeps all financial execution disabled; customer actions are administrative/demo only.

alter table if exists public.order_status_events rename to order_events;
alter table if exists public.p2p_trades rename to p2p_orders;
alter table if exists public.disputes rename column p2p_trade_id to p2p_order_id;
alter table if exists public.pricing_rules rename to pricing_settings;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  legal_name text not null,
  trading_name text,
  registration_number text,
  country_code text,
  registered_address jsonb not null default '{}'::jsonb,
  website text,
  industry text,
  ubo_details jsonb not null default '[]'::jsonb,
  authorized_signatory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null,
  legal_reference text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_content (
  key text primary key,
  version text not null,
  title_ar text not null,
  title_en text not null,
  body_ar text not null,
  body_en text not null,
  published boolean not null default false,
  effective_at timestamptz,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_key text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  ip_hash text,
  user_agent_hash text,
  unique (user_id, document_key, document_version)
);

create table if not exists public.wallet_addresses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  network text not null check (network in ('TRC20','ERC20')),
  address text not null,
  purpose text not null default 'manual_settlement',
  active boolean not null default false,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, address)
);

create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  successful boolean not null,
  ip_hash text,
  user_agent_hash text,
  country_hint text,
  created_at timestamptz not null default now()
);

create table if not exists public.p2p_evidence (
  id uuid primary key default gen_random_uuid(),
  p2p_order_id uuid not null references public.p2p_orders(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.payment_methods add column if not exists phone text;
alter table public.payment_methods add column if not exists city text;
alter table public.payment_methods add column if not exists qr_alt_text_ar text;
alter table public.payment_methods add column if not exists qr_alt_text_en text;

alter table public.pricing_settings add column if not exists indicative_only boolean not null default true;
alter table public.pricing_settings add column if not exists label text;

alter table public.orders add column if not exists quote_created_at timestamptz;
alter table public.orders add column if not exists total_amount numeric(20,2);
alter table public.orders add column if not exists customer_note text;
alter table public.orders add column if not exists is_demo boolean not null default true;

alter table public.payment_proofs add column if not exists customer_note text;
alter table public.payment_proofs add column if not exists mismatch_flag boolean not null default false;
alter table public.payment_proofs add column if not exists mismatch_reason text;

alter table public.p2p_offers add column if not exists approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','suspended'));
alter table public.p2p_orders add column if not exists admin_approved_at timestamptz;
alter table public.p2p_orders add column if not exists admin_approved_by uuid references public.profiles(id);
alter table public.p2p_orders add column if not exists release_note text;
alter table public.p2p_orders add column if not exists manual_release_required boolean not null default true;

insert into public.feature_flags (key, enabled, description) values
  ('live_trading', false, 'Master financial execution flag'),
  ('deposits', false, 'Accept real customer deposits'),
  ('payouts', false, 'Send real customer payouts'),
  ('wallet_automation', false, 'Automated wallet operations'),
  ('p2p_release', false, 'Release digital assets for P2P'),
  ('demo_requests', true, 'Allow administrative demo requests'),
  ('kyc_submission', true, 'Allow KYC submission'),
  ('proof_uploads', true, 'Allow demo proof uploads')
on conflict (key) do nothing;

insert into public.legal_content (key, version, title_ar, title_en, body_ar, body_en, published, effective_at) values
  ('terms', '2026-07-15', 'شروط الاستخدام', 'Terms of use', 'هذه المنصة في وضع ما قبل الإطلاق. لا يتم قبول أموال أو تنفيذ تداول أو تحويل أو إطلاق أصول رقمية. الطلبات إدارية وتجريبية فقط.', 'This platform is in pre-launch. No funds are accepted and no trade, transfer or digital-asset release is executed. Requests are administrative and demonstrational only.', true, now()),
  ('privacy', '2026-07-15', 'سياسة الخصوصية', 'Privacy policy', 'تُحفظ بيانات الهوية والملفات في تخزين خاص وتُتاح فقط لصاحب الحساب والموظفين المخولين وفق الصلاحيات.', 'Identity data and files are kept in private storage and are available only to the account owner and authorized staff under role-based controls.', true, now()),
  ('risk', '2026-07-15', 'إفصاح المخاطر والتنظيم', 'Risk and regulatory disclosure', 'لا تدّعي Gulf Gate امتلاك ترخيص لخدمات الأصول الافتراضية حالياً. لا تعتمد على المحتوى كعرض أو توصية مالية.', 'Gulf Gate does not currently claim to hold a virtual-asset services licence. Content is not a financial offer or recommendation.', true, now())
on conflict (key) do nothing;

update public.payment_methods set
  account_holder = 'DEMO — DO NOT PAY',
  account_number_masked = case code when 'bank_transfer' then 'DEMO-BANK-0000' when 'fib' then 'DEMO-FIB-0000' when 'superqi' then 'DEMO-QI-0000' when 'zain_cash' then 'DEMO-ZAIN-0000' else 'DEMO-ONLY' end,
  phone = case when code in ('fib','superqi','zain_cash','wallet_transfer') then '+000000000000' else null end,
  instructions_ar = 'طريقة تجريبية فقط. لا ترسل أي أموال.',
  instructions_en = 'Demo method only. Do not send funds.',
  min_amount = 100,
  max_amount = 25000,
  supported_cities = array['Baghdad','Erbil','Sulaymaniyah'],
  active = true
where code in ('bank_transfer','fib','superqi','zain_cash','cash_representative','wallet_transfer');

insert into public.pricing_settings (order_type, fiat_currency, network, reference_rate, spread_bps, flat_fee, percentage_fee, min_amount, max_amount, quote_ttl_seconds, active, indicative_only, label) values
  ('buy','USD','TRC20',1.002,20,0,0.50,100,25000,600,true,true,'Demo indicative USD/TRC20'),
  ('buy','AED','TRC20',3.680,25,0,0.50,500,90000,600,true,true,'Demo indicative AED/TRC20'),
  ('buy','IQD','TRC20',1310,30,0,0.75,150000,30000000,600,true,true,'Demo indicative IQD/TRC20'),
  ('sell','USD','TRC20',0.998,20,0,0.50,100,25000,600,true,true,'Demo indicative USD/TRC20'),
  ('sell','AED','TRC20',3.660,25,0,0.50,500,90000,600,true,true,'Demo indicative AED/TRC20'),
  ('sell','IQD','TRC20',1290,30,0,0.75,150000,30000000,600,true,true,'Demo indicative IQD/TRC20'),
  ('buy','USD','ERC20',1.004,30,5,0.50,250,25000,600,true,true,'Demo indicative USD/ERC20'),
  ('sell','USD','ERC20',0.996,30,5,0.50,250,25000,600,true,true,'Demo indicative USD/ERC20')
on conflict (order_type, fiat_currency, network) do update set
  reference_rate = excluded.reference_rate,
  spread_bps = excluded.spread_bps,
  flat_fee = excluded.flat_fee,
  percentage_fee = excluded.percentage_fee,
  min_amount = excluded.min_amount,
  max_amount = excluded.max_amount,
  quote_ttl_seconds = excluded.quote_ttl_seconds,
  active = excluded.active,
  indicative_only = true,
  label = excluded.label;

create trigger business_profiles_updated_at before update on public.business_profiles for each row execute function public.set_updated_at();
create trigger wallets_updated_at before update on public.wallet_addresses for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare accepted_version text;
begin
  accepted_version := coalesce(new.raw_user_meta_data->>'terms_version', '2026-07-15');
  insert into public.profiles (id, display_name, phone, preferred_locale, terms_accepted_at, terms_version)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    new.phone,
    coalesce(new.raw_user_meta_data->>'preferred_locale', 'ar'),
    case when coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false) then now() else null end,
    accepted_version
  );
  if coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false) then
    insert into public.legal_acceptances (user_id, document_key, document_version)
    values (new.id, 'terms', accepted_version), (new.id, 'privacy', accepted_version), (new.id, 'risk', accepted_version)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.review_kyc(case_id uuid, new_status public.kyc_status, note text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if new_status not in ('under_review','approved','rejected','resubmission_required') then raise exception 'INVALID_STATUS'; end if;
  update public.kyc_cases set status = new_status, reviewer_id = auth.uid(), review_notes = left(note,2000), reviewed_at = now() where id = case_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  return true;
end;
$$;

create or replace function public.review_payment_proof(proof_id uuid, new_status public.proof_status, note text default null, flag_mismatch boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.has_staff_role(array['super_admin','operations','finance','reviewer']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if new_status not in ('under_review','approved','rejected','resubmission_required') then raise exception 'INVALID_STATUS'; end if;
  update public.payment_proofs set status = new_status, reviewer_id = auth.uid(), reviewer_note = left(note,2000), mismatch_flag = flag_mismatch, mismatch_reason = case when flag_mismatch then left(note,2000) else null end, reviewed_at = now() where id = proof_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  return true;
end;
$$;

create or replace function public.transition_order(order_id uuid, new_status public.order_status, note text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_status public.order_status;
begin
  if not public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  select status into current_status from public.orders where id = order_id for update;
  if current_status is null then raise exception 'NOT_FOUND'; end if;
  if not (
    (current_status = 'draft' and new_status in ('awaiting_kyc','cancelled')) or
    (current_status = 'awaiting_kyc' and new_status in ('awaiting_payment','cancelled','rejected')) or
    (current_status = 'awaiting_payment' and new_status in ('proof_uploaded','cancelled')) or
    (current_status = 'proof_uploaded' and new_status in ('under_review','awaiting_payment','compliance_hold')) or
    (current_status = 'under_review' and new_status in ('payment_confirmed','compliance_hold','rejected','refund_required')) or
    (current_status = 'payment_confirmed' and new_status in ('approved','compliance_hold','refund_required')) or
    (current_status = 'compliance_hold' and new_status in ('under_review','approved','rejected','refund_required')) or
    (current_status = 'approved' and new_status in ('processing','cancelled','refund_required')) or
    (current_status = 'processing' and new_status in ('completed','refund_required'))
  ) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  if not public.is_live_trading() and new_status in ('processing','completed') then raise exception 'LIVE_TRADING_DISABLED'; end if;
  if new_status = 'payment_confirmed' and not public.has_staff_role(array['super_admin','finance']::public.staff_role[]) then raise exception 'FINANCE_ROLE_REQUIRED'; end if;
  if new_status = 'compliance_hold' and not public.has_staff_role(array['super_admin','compliance']::public.staff_role[]) then raise exception 'COMPLIANCE_ROLE_REQUIRED'; end if;
  update public.orders set status = new_status, internal_note = coalesce(left(note,2000), internal_note) where id = order_id;
  return true;
end;
$$;

drop function if exists public.set_live_trading(boolean,text);
create function public.set_live_trading(_enabled boolean, _legal_reference text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.has_staff_role(array['super_admin']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then raise exception 'MFA_REQUIRED'; end if;
  if _enabled and (_legal_reference is null or length(trim(_legal_reference)) < 12) then raise exception 'LEGAL_APPROVAL_REFERENCE_REQUIRED'; end if;
  update public.site_settings set value = to_jsonb(_enabled), updated_by = auth.uid(), updated_at = now() where key = 'live_trading';
  update public.site_settings set value = to_jsonb(_legal_reference), updated_by = auth.uid(), updated_at = now() where key = 'legal_approval_reference';
  update public.feature_flags set enabled = _enabled, legal_reference = _legal_reference, updated_by = auth.uid(), updated_at = now() where key = 'live_trading';
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, new_data)
  values (auth.uid(), 'super_admin', case when _enabled then 'activate_live_trading' else 'deactivate_live_trading' end, 'feature_flags', 'live_trading', jsonb_build_object('enabled', _enabled, 'legal_reference', _legal_reference));
  return _enabled;
end;
$$;
grant execute on function public.set_live_trading(boolean,text) to authenticated;
revoke all on function public.set_live_trading(boolean,text) from public;

drop policy if exists kyc_staff_all on public.kyc_cases;
drop policy if exists proofs_staff_all on public.payment_proofs;
drop policy if exists orders_staff_all on public.orders;
drop policy if exists orders_owner_insert on public.orders;

create policy kyc_staff_select on public.kyc_cases for select using (public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]));
create policy proofs_staff_select on public.payment_proofs for select using (public.has_staff_role(array['super_admin','operations','finance','reviewer']::public.staff_role[]));
create policy orders_staff_select on public.orders for select using (public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]));
create policy orders_owner_insert on public.orders for insert with check (
  user_id = (select auth.uid())
  and is_demo = true
  and settlement_tx_hash is null and settlement_at is null and assigned_to is null and risk_score is null and internal_note is null
  and (
    status in ('draft','awaiting_kyc')
    or (status = 'awaiting_payment' and exists (select 1 from public.kyc_cases k where k.user_id = (select auth.uid()) and k.status = 'approved'))
  )
);

alter table public.business_profiles enable row level security;
alter table public.feature_flags enable row level security;
alter table public.legal_content enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.wallet_addresses enable row level security;
alter table public.login_events enable row level security;
alter table public.p2p_evidence enable row level security;

create policy business_owner_select on public.business_profiles for select using (user_id = (select auth.uid()));
create policy business_owner_insert on public.business_profiles for insert with check (user_id = (select auth.uid()));
create policy business_owner_update on public.business_profiles for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy business_staff_select on public.business_profiles for select using (public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]));

create policy flags_public_safe_select on public.feature_flags for select using (key in ('live_trading','demo_requests','kyc_submission','proof_uploads'));
create policy flags_admin_all on public.feature_flags for all using (public.has_staff_role(array['super_admin']::public.staff_role[])) with check (public.has_staff_role(array['super_admin']::public.staff_role[]));
create policy legal_public_select on public.legal_content for select using (published or public.has_staff_role(array['super_admin','compliance']::public.staff_role[]));
create policy legal_admin_all on public.legal_content for all using (public.has_staff_role(array['super_admin','compliance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','compliance']::public.staff_role[]));
create policy acceptances_owner_select on public.legal_acceptances for select using (user_id = (select auth.uid()));
create policy acceptances_owner_insert on public.legal_acceptances for insert with check (user_id = (select auth.uid()));
create policy acceptances_compliance_select on public.legal_acceptances for select using (public.has_staff_role(array['super_admin','compliance']::public.staff_role[]));
create policy wallets_staff_select on public.wallet_addresses for select using (public.has_staff_role(array['super_admin','operations','finance','compliance']::public.staff_role[]));
create policy wallets_admin_all on public.wallet_addresses for all using (public.has_staff_role(array['super_admin','finance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));
create policy login_events_owner_select on public.login_events for select using (user_id = (select auth.uid()));
create policy login_events_owner_insert on public.login_events for insert with check (user_id = (select auth.uid()));
create policy login_events_admin_select on public.login_events for select using (public.has_staff_role(array['super_admin']::public.staff_role[]));
create policy p2p_evidence_party_select on public.p2p_evidence for select using (exists (select 1 from public.p2p_orders p where p.id = p2p_order_id and ((select auth.uid()) in (p.buyer_id,p.seller_id))));
create policy p2p_evidence_party_insert on public.p2p_evidence for insert with check (uploaded_by = (select auth.uid()) and exists (select 1 from public.p2p_orders p where p.id = p2p_order_id and ((select auth.uid()) in (p.buyer_id,p.seller_id))));
create policy p2p_evidence_staff_select on public.p2p_evidence for select using (public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]));

revoke update on public.kyc_cases from authenticated;
grant update (account_type,date_of_birth,nationality,residential_address,business_details,source_of_funds,source_of_wealth,transaction_purpose,expected_monthly_volume,status,submitted_at) on public.kyc_cases to authenticated;
revoke update on public.orders from authenticated;
grant update (wallet_address,amount_fiat,transaction_purpose,customer_note,status) on public.orders to authenticated;
revoke update on public.payment_proofs from authenticated;

revoke all on function public.review_kyc(uuid, public.kyc_status, text) from public;
revoke all on function public.review_payment_proof(uuid, public.proof_status, text, boolean) from public;
revoke all on function public.transition_order(uuid, public.order_status, text) from public;
grant execute on function public.review_kyc(uuid, public.kyc_status, text) to authenticated;
grant execute on function public.review_payment_proof(uuid, public.proof_status, text, boolean) to authenticated;
grant execute on function public.transition_order(uuid, public.order_status, text) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('p2p-evidence','p2p-evidence',false,10485760,array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

create policy storage_p2p_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'p2p-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_p2p_owner_select on storage.objects for select to authenticated
using (bucket_id = 'p2p-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_p2p_staff_select on storage.objects for select to authenticated
using (bucket_id = 'p2p-evidence' and public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]));

create index if not exists business_profiles_user_idx on public.business_profiles(user_id);
create index if not exists legal_acceptances_user_idx on public.legal_acceptances(user_id,accepted_at desc);
create index if not exists login_events_user_idx on public.login_events(user_id,created_at desc);
create index if not exists p2p_evidence_order_idx on public.p2p_evidence(p2p_order_id,created_at desc);
