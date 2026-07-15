-- Dedicated operational controls adapted from proven SaaS RBAC patterns.
-- Financial execution remains disabled and these tables never initiate transfers.

create table public.p2p_merchants (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  display_name text not null,
  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  completion_rate numeric(5,2) not null default 0 check (completion_rate between 0 and 100),
  completed_orders integer not null default 0 check (completed_orders >= 0),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fee_rules (
  id uuid primary key default gen_random_uuid(),
  order_type public.order_type not null,
  fiat_currency text not null check (fiat_currency in ('USD','AED','IQD')),
  network text not null check (network in ('TRC20','ERC20')),
  flat_fee numeric(20,2) not null default 0 check (flat_fee >= 0),
  percentage_fee numeric(8,5) not null default 0 check (percentage_fee between 0 and 100),
  active boolean not null default false,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_type,fiat_currency,network)
);

create table public.limit_rules (
  id uuid primary key default gen_random_uuid(),
  account_type public.account_type not null,
  kyc_status public.kyc_status not null default 'approved',
  order_type public.order_type not null,
  fiat_currency text not null check (fiat_currency in ('USD','AED','IQD')),
  min_amount numeric(20,2) not null default 0 check (min_amount >= 0),
  max_amount numeric(20,2) check (max_amount is null or max_amount >= min_amount),
  daily_limit numeric(20,2),
  monthly_limit numeric(20,2),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_type,kyc_status,order_type,fiat_currency)
);

create table public.risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  p2p_order_id uuid references public.p2p_orders(id) on delete restrict,
  code text not null,
  severity public.alert_severity not null default 'medium',
  status text not null default 'open' check (status in ('open','investigating','cleared','escalated','reported')),
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.profiles(id),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or order_id is not null or p2p_order_id is not null)
);

create trigger p2p_merchants_updated_at before update on public.p2p_merchants for each row execute function public.set_updated_at();
create trigger fee_rules_updated_at before update on public.fee_rules for each row execute function public.set_updated_at();
create trigger limit_rules_updated_at before update on public.limit_rules for each row execute function public.set_updated_at();
create trigger risk_flags_updated_at before update on public.risk_flags for each row execute function public.set_updated_at();
create trigger audit_p2p_merchants after insert or update or delete on public.p2p_merchants for each row execute function public.audit_critical_change();
create trigger audit_fee_rules after insert or update or delete on public.fee_rules for each row execute function public.audit_critical_change();
create trigger audit_limit_rules after insert or update or delete on public.limit_rules for each row execute function public.audit_critical_change();
create trigger audit_risk_flags after insert or update or delete on public.risk_flags for each row execute function public.audit_critical_change();

alter table public.p2p_merchants enable row level security;
alter table public.fee_rules enable row level security;
alter table public.limit_rules enable row level security;
alter table public.risk_flags enable row level security;

create policy merchants_public_approved_select on public.p2p_merchants for select using (status='approved' or user_id=(select auth.uid()) or public.has_staff_role(array['super_admin','operations','compliance','reviewer']::public.staff_role[]));
create policy merchants_owner_insert on public.p2p_merchants for insert with check (user_id=(select auth.uid()) and status='pending' and approved_by is null and approved_at is null);
create policy merchants_staff_update on public.p2p_merchants for update using (public.has_staff_role(array['super_admin','operations','compliance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','operations','compliance']::public.staff_role[]));

create policy fee_rules_authenticated_select on public.fee_rules for select to authenticated using (active or public.has_staff_role(array['super_admin','finance']::public.staff_role[]));
create policy fee_rules_finance_all on public.fee_rules for all using (public.has_staff_role(array['super_admin','finance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));
create policy limit_rules_authenticated_select on public.limit_rules for select to authenticated using (active or public.has_staff_role(array['super_admin','finance','compliance']::public.staff_role[]));
create policy limit_rules_staff_all on public.limit_rules for all using (public.has_staff_role(array['super_admin','finance','compliance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','finance','compliance']::public.staff_role[]));
create policy risk_flags_staff_select on public.risk_flags for select using (public.has_staff_role(array['super_admin','operations','compliance','reviewer']::public.staff_role[]));
create policy risk_flags_compliance_all on public.risk_flags for all using (public.has_staff_role(array['super_admin','compliance']::public.staff_role[])) with check (public.has_staff_role(array['super_admin','compliance']::public.staff_role[]));

insert into public.fee_rules(order_type,fiat_currency,network,flat_fee,percentage_fee,active)
select order_type,fiat_currency,network,flat_fee,percentage_fee,active from public.pricing_settings
on conflict(order_type,fiat_currency,network) do update set flat_fee=excluded.flat_fee,percentage_fee=excluded.percentage_fee,active=excluded.active;

insert into public.limit_rules(account_type,kyc_status,order_type,fiat_currency,min_amount,max_amount,active)
select account_type,'approved',p.order_type,p.fiat_currency,min(p.min_amount),max(p.max_amount),true
from (values ('individual'::public.account_type),('business'::public.account_type)) a(account_type)
cross join public.pricing_settings p group by account_type,p.order_type,p.fiat_currency
on conflict(account_type,kyc_status,order_type,fiat_currency) do nothing;

create index risk_flags_open_idx on public.risk_flags(status,severity,created_at desc);
create index p2p_merchants_status_idx on public.p2p_merchants(status,completion_rate desc);
