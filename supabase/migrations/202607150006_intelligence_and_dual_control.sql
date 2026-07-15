-- Operations Intelligence: compliance cases, SLA, dual control and merchant scorecards.
-- This migration adds review controls only. It never executes deposits, payouts,
-- transfers, settlement, custody or digital-asset release.

create table public.compliance_cases (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique default ('CASE-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.order_reference_seq')::text,6,'0')),
  case_type text not null check(case_type in ('kyc','order','proof','p2p','dispute','account','manual')),
  subject_user_id uuid references public.profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  p2p_order_id uuid references public.p2p_orders(id) on delete restrict,
  risk_score smallint not null default 0 check(risk_score between 0 and 100),
  risk_band text generated always as (case when risk_score>=75 then 'critical' when risk_score>=50 then 'high' when risk_score>=25 then 'medium' else 'low' end) stored,
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  stage text not null default 'open' check(stage in ('open','triage','investigating','waiting_customer','pending_approval','resolved','closed')),
  title text not null,
  summary text,
  assigned_to uuid references public.profiles(id),
  sla_due_at timestamptz not null default (now()+interval '24 hours'),
  resolution_code text,
  resolution_note text,
  created_by uuid references public.profiles(id),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(subject_user_id is not null or order_id is not null or p2p_order_id is not null or case_type='manual')
);

create table public.case_checklist_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.compliance_cases(id) on delete cascade,
  label_ar text not null,
  label_en text not null,
  required boolean not null default true,
  completed boolean not null default false,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check(action_type in ('order_demo_approval','kyc_l3_approval','merchant_approval','payment_method_change','pricing_change','case_resolution','feature_change')),
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  reason text not null check(char_length(reason) between 10 and 2000),
  status text not null default 'pending' check(status in ('pending','approved','rejected','expired','cancelled')),
  requested_by uuid not null references public.profiles(id),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_note text,
  expires_at timestamptz not null default (now()+interval '24 hours'),
  created_at timestamptz not null default now(),
  check(decided_by is null or decided_by<>requested_by)
);

create table public.merchant_metric_snapshots (
  id bigint generated always as identity primary key,
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  completed_orders integer not null default 0,
  cancelled_orders integer not null default 0,
  disputed_orders integer not null default 0,
  completion_rate numeric(5,2) not null default 0 check(completion_rate between 0 and 100),
  appeal_rate numeric(5,2) not null default 0 check(appeal_rate between 0 and 100),
  positive_feedback_rate numeric(5,2) not null default 0 check(positive_feedback_rate between 0 and 100),
  avg_payment_minutes numeric(10,2),
  response_score numeric(5,2) not null default 0 check(response_score between 0 and 100),
  risk_score numeric(5,2) not null default 0 check(risk_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique(merchant_id,period_start,period_end)
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check(scope in ('ops','cases','orders','kyc','proofs','p2p')),
  name text not null check(char_length(name) between 2 and 80),
  filters jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id,scope,name)
);

create trigger compliance_cases_updated_at before update on public.compliance_cases for each row execute function public.set_updated_at();
create trigger audit_compliance_cases after insert or update or delete on public.compliance_cases for each row execute function public.audit_critical_change();
create trigger audit_case_checklist after insert or update or delete on public.case_checklist_items for each row execute function public.audit_critical_change();
create trigger audit_approval_requests after insert or update or delete on public.approval_requests for each row execute function public.audit_critical_change();

alter table public.compliance_cases enable row level security;
alter table public.case_checklist_items enable row level security;
alter table public.approval_requests enable row level security;
alter table public.merchant_metric_snapshots enable row level security;
alter table public.saved_views enable row level security;

create policy compliance_cases_staff_read on public.compliance_cases for select using(public.has_staff_role(array['super_admin','operations','compliance','reviewer','support']::public.staff_role[]));
create policy compliance_cases_compliance_manage on public.compliance_cases for all using(public.has_staff_role(array['super_admin','compliance']::public.staff_role[])) with check(public.has_staff_role(array['super_admin','compliance']::public.staff_role[]));
create policy checklist_staff_read on public.case_checklist_items for select using(public.has_staff_role(array['super_admin','operations','compliance','reviewer']::public.staff_role[]));
create policy checklist_compliance_manage on public.case_checklist_items for all using(public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[])) with check(public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]));
create policy approvals_staff_read on public.approval_requests for select using(public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]));
create policy approvals_staff_insert on public.approval_requests for insert with check(requested_by=(select auth.uid()) and public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]));
create policy merchant_metrics_authenticated_read on public.merchant_metric_snapshots for select to authenticated using(true);
create policy merchant_metrics_ops_manage on public.merchant_metric_snapshots for all using(public.has_staff_role(array['super_admin','operations','compliance']::public.staff_role[])) with check(public.has_staff_role(array['super_admin','operations','compliance']::public.staff_role[]));
create policy saved_views_owner_all on public.saved_views for all using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create or replace function public.decide_approval_request(_id uuid,_approve boolean,_note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare request public.approval_requests;
begin
 if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;
 if not public.has_staff_role(array['super_admin','compliance','finance']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
 select * into request from public.approval_requests where id=_id and status='pending' for update;
 if request.id is null then raise exception 'NOT_FOUND_OR_DECIDED'; end if;
 if request.requested_by=auth.uid() then raise exception 'FOUR_EYES_REQUIRED'; end if;
 if request.expires_at<=now() then update public.approval_requests set status='expired' where id=_id; raise exception 'EXPIRED'; end if;
 update public.approval_requests set status=case when _approve then 'approved' else 'rejected' end,decided_by=auth.uid(),decided_at=now(),decision_note=left(_note,2000) where id=_id;
 if _approve and request.action_type='order_demo_approval' then
   perform public.transition_order(request.entity_id::uuid,'approved'::public.order_status,coalesce(_note,'Approved under four-eyes control'));
 end if;
 return true;
end;$$;
grant execute on function public.decide_approval_request(uuid,boolean,text) to authenticated;
revoke all on function public.decide_approval_request(uuid,boolean,text) from public;

create or replace function public.complete_case_checklist(_item uuid,_completed boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;
 if not public.has_staff_role(array['super_admin','compliance','reviewer']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
 update public.case_checklist_items set completed=_completed,completed_by=case when _completed then auth.uid() else null end,completed_at=case when _completed then now() else null end where id=_item;
 return found;
end;$$;
grant execute on function public.complete_case_checklist(uuid,boolean) to authenticated;

create index compliance_cases_queue_idx on public.compliance_cases(stage,priority,sla_due_at);
create index compliance_cases_subject_idx on public.compliance_cases(subject_user_id,created_at desc);
create index approvals_pending_idx on public.approval_requests(status,expires_at);
create index merchant_metrics_rank_idx on public.merchant_metric_snapshots(period_end desc,completion_rate desc,risk_score);
