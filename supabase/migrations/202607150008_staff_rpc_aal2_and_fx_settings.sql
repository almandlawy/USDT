-- Require AAL2 for privileged staff RPCs previously gated only in the app layer.
-- Store indicative FX fallback values for IQD/AED display. Does not unlock LIVE_TRADING.

create table if not exists public.market_fx_settings (
  id smallint primary key default 1 check (id = 1),
  usd_to_iqd numeric(18,6) not null default 1310 check (usd_to_iqd > 0),
  usd_to_aed numeric(18,6) not null default 3.6725 check (usd_to_aed > 0),
  notes text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.market_fx_settings (id, usd_to_iqd, usd_to_aed, notes)
values (1, 1310, 3.6725, 'Indicative fallback FX — not a live trade quote')
on conflict (id) do nothing;

alter table public.market_fx_settings enable row level security;

drop policy if exists market_fx_settings_public_select on public.market_fx_settings;
create policy market_fx_settings_public_select on public.market_fx_settings
  for select using (true);

drop policy if exists market_fx_settings_finance_update on public.market_fx_settings;
create policy market_fx_settings_finance_update on public.market_fx_settings
  for update using (public.has_staff_role(array['super_admin','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin','finance']::public.staff_role[]));

create or replace function public.require_staff_aal2()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'MFA_REQUIRED';
  end if;
end;
$$;

create or replace function public.review_kyc(case_id uuid, new_status public.kyc_status, note text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public.require_staff_aal2();
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
  perform public.require_staff_aal2();
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
  perform public.require_staff_aal2();
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

comment on table public.market_fx_settings is 'Indicative FX fallbacks for market display only. Does not unlock LIVE_TRADING.';
comment on function public.require_staff_aal2 is 'Fails closed unless the caller JWT is AAL2.';
