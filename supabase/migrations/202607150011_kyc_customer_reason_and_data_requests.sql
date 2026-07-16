-- Migration 011 — Production readiness follow-up (additive)
-- Separates customer-visible KYC/proof reasons from internal review notes.
-- Adds data_requests for deletion/export/correction.
-- Does NOT enable live trading or settlement.
-- LEGAL REVIEW REQUIRED BEFORE PUBLIC LAUNCH

-- ---------------------------------------------------------------------------
-- KYC columns
-- ---------------------------------------------------------------------------
alter table public.kyc_cases
  add column if not exists customer_reason text,
  add column if not exists internal_review_notes text;

comment on column public.kyc_cases.customer_reason is
  'Customer-visible rejection/resubmission reason only. Never auto-copy from internal notes.';
comment on column public.kyc_cases.internal_review_notes is
  'Staff-only review notes. Application must not select this for customers.';

-- Do NOT backfill customer_reason from review_notes (may contain internal content).

-- ---------------------------------------------------------------------------
-- Payment proof columns
-- ---------------------------------------------------------------------------
alter table public.payment_proofs
  add column if not exists customer_reason text,
  add column if not exists internal_review_notes text;

comment on column public.payment_proofs.customer_reason is
  'Customer-visible proof decision reason.';
comment on column public.payment_proofs.internal_review_notes is
  'Staff-only proof review notes.';

-- ---------------------------------------------------------------------------
-- Replace review_kyc (single signature — drop legacy first)
-- ---------------------------------------------------------------------------
drop function if exists public.review_kyc(uuid, public.kyc_status, text);

create or replace function public.review_kyc(
  case_id uuid,
  new_status public.kyc_status,
  customer_reason text default null,
  internal_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_staff_aal2();
  if not public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  if new_status not in ('under_review','approved','rejected','resubmission_required') then
    raise exception 'INVALID_STATUS';
  end if;
  if new_status in ('rejected','resubmission_required')
     and (customer_reason is null or length(trim(customer_reason)) < 4) then
    raise exception 'CUSTOMER_REASON_REQUIRED';
  end if;

  update public.kyc_cases set
    status = new_status,
    reviewer_id = auth.uid(),
    customer_reason = case
      when new_status in ('rejected','resubmission_required') then left(trim(customer_reason), 2000)
      else null
    end,
    internal_review_notes = left(nullif(trim(internal_note), ''), 2000),
    review_notes = left(nullif(trim(internal_note), ''), 2000),
    reviewed_at = now()
  where id = case_id;

  if not found then raise exception 'NOT_FOUND'; end if;
  -- Row-level audit_kyc trigger records the change. Avoid storing secrets/tokens.
  return true;
end;
$$;

grant execute on function public.review_kyc(uuid, public.kyc_status, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace review_payment_proof
-- ---------------------------------------------------------------------------
drop function if exists public.review_payment_proof(uuid, public.proof_status, text, boolean);

create or replace function public.review_payment_proof(
  proof_id uuid,
  new_status public.proof_status,
  customer_reason text default null,
  internal_note text default null,
  flag_mismatch boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_staff_aal2();
  if not public.has_staff_role(array['super_admin','operations','finance','reviewer']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  if new_status not in ('under_review','approved','rejected','resubmission_required') then
    raise exception 'INVALID_STATUS';
  end if;
  if new_status in ('rejected','resubmission_required')
     and (customer_reason is null or length(trim(customer_reason)) < 4) then
    raise exception 'CUSTOMER_REASON_REQUIRED';
  end if;

  update public.payment_proofs set
    status = new_status,
    reviewer_id = auth.uid(),
    customer_reason = case
      when new_status in ('rejected','resubmission_required') then left(trim(customer_reason), 2000)
      else null
    end,
    internal_review_notes = left(nullif(trim(internal_note), ''), 2000),
    reviewer_note = left(nullif(trim(internal_note), ''), 2000),
    mismatch_flag = flag_mismatch,
    mismatch_reason = case
      when flag_mismatch then left(coalesce(customer_reason, internal_note), 2000)
      else null
    end,
    reviewed_at = now()
  where id = proof_id;

  if not found then raise exception 'NOT_FOUND'; end if;
  return true;
end;
$$;

grant execute on function public.review_payment_proof(uuid, public.proof_status, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Customer KYC view (excludes internal notes)
-- ---------------------------------------------------------------------------
create or replace view public.kyc_cases_customer
with (security_invoker = true) as
select
  id, user_id, account_type, status, nationality, date_of_birth, residential_address,
  source_of_funds, transaction_purpose, expected_monthly_volume, customer_reason,
  submitted_at, reviewed_at, created_at, updated_at
from public.kyc_cases
where user_id = auth.uid();

grant select on public.kyc_cases_customer to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications: customer_reason only (never internal notes)
-- ---------------------------------------------------------------------------
create or replace function public.notify_customer_kyc_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  title_ar text;
  title_en text;
  body_ar text;
  body_en text;
  reason text;
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;
  if new.status not in ('approved','rejected','resubmission_required','under_review') then
    return new;
  end if;

  reason := coalesce(nullif(trim(new.customer_reason), ''), '');

  title_ar := case new.status
    when 'approved' then 'تم اعتماد التحقق'
    when 'rejected' then 'تم رفض التحقق'
    when 'resubmission_required' then 'يلزم إعادة تقديم المستندات'
    else 'تحديث حالة التحقق'
  end;
  title_en := case new.status
    when 'approved' then 'Verification approved'
    when 'rejected' then 'Verification rejected'
    when 'resubmission_required' then 'Document resubmission required'
    else 'Verification status update'
  end;
  body_ar := case
    when reason <> '' then reason
    when new.status = 'approved' then 'تم اعتماد ملف التحقق الخاص بك.'
    else 'تم تحديث حالة التحقق. راجع صفحة التحقق للتفاصيل.'
  end;
  body_en := case
    when reason <> '' then reason
    when new.status = 'approved' then 'Your verification file was approved.'
    else 'Your verification status was updated. Open the verification page for details.'
  end;

  insert into public.notifications (user_id, kind, title_ar, title_en, body_ar, body_en, link)
  values (new.user_id, 'kyc', title_ar, title_en, body_ar, body_en, '/dashboard/kyc');

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- data_requests
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.data_request_type as enum ('account_deletion', 'data_export', 'data_correction');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.data_request_status as enum (
    'submitted', 'under_review', 'identity_check', 'approved', 'rejected', 'completed'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  request_type public.data_request_type not null,
  status public.data_request_status not null default 'submitted',
  details text,
  customer_reason text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists data_requests_user_created_idx
  on public.data_requests (user_id, created_at desc);
create index if not exists data_requests_status_idx
  on public.data_requests (status, created_at desc);

alter table public.data_requests enable row level security;

drop policy if exists data_requests_owner_select on public.data_requests;
create policy data_requests_owner_select on public.data_requests
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists data_requests_owner_insert on public.data_requests;
create policy data_requests_owner_insert on public.data_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'submitted'
    and internal_notes is null
  );

drop policy if exists data_requests_staff_all on public.data_requests;
create policy data_requests_staff_all on public.data_requests
  for all to authenticated
  using (public.has_staff_role(array['super_admin','compliance','support']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','compliance','support']::public.staff_role[]));

create or replace view public.data_requests_customer
with (security_invoker = true) as
select id, user_id, request_type, status, details, customer_reason, created_at, updated_at, resolved_at
from public.data_requests
where user_id = auth.uid();

grant select on public.data_requests_customer to authenticated;
grant select, insert on table public.data_requests to authenticated;

-- ---------------------------------------------------------------------------
-- Schema marker + keep live trading locked
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value)
values ('schema_migration_marker', '"202607150011"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

update public.site_settings
set value = 'false'::jsonb, updated_at = now()
where key = 'live_trading' and value is distinct from 'false'::jsonb;
