-- Production readiness hardening (non-destructive).
-- Fixes: audit actor_role, FX public exposure, notification staff scope,
-- login retention helper, useful indexes. Does NOT unlock LIVE_TRADING.

-- 1) Correct audit actor_role to staff role (not JWT AAL).
create or replace function public.current_staff_role_label()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role::text
      from public.staff_roles
      where user_id = auth.uid()
      order by case role
        when 'super_admin' then 1
        when 'compliance' then 2
        when 'operations' then 3
        when 'finance' then 4
        when 'support' then 5
        when 'reviewer' then 6
        else 9
      end
      limit 1
    ),
    case when auth.uid() is null then 'system' else 'customer' end
  );
$$;

create or replace function public.audit_critical_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity text;
  row_data jsonb;
  actor_label text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  entity := coalesce(row_data->>'id', row_data->>'user_id', row_data->>'key', 'unknown');
  actor_label := public.current_staff_role_label();
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(),
    actor_label,
    lower(tg_op),
    tg_table_name,
    entity,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- 2) Public FX view without notes / updated_by.
create or replace view public.market_fx_public
with (security_invoker = true)
as
select usd_to_iqd, usd_to_aed, updated_at
from public.market_fx_settings
where id = 1;

grant select on public.market_fx_public to anon, authenticated;

drop policy if exists market_fx_settings_public_select on public.market_fx_settings;
create policy market_fx_settings_staff_select on public.market_fx_settings
  for select
  using (public.has_staff_role(array['super_admin','finance','operations','compliance']::public.staff_role[]));

-- Keep finance/super_admin update; require AAL2 via RPC wrapper for app updates.
create or replace function public.update_market_fx(
  _usd_to_iqd numeric,
  _usd_to_aed numeric,
  _notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_staff_aal2();
  if not public.has_staff_role(array['super_admin','finance']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  if _usd_to_iqd is null or _usd_to_iqd <= 0 or _usd_to_aed is null or _usd_to_aed <= 0 then
    raise exception 'INVALID_FX';
  end if;
  insert into public.market_fx_settings (id, usd_to_iqd, usd_to_aed, notes, updated_by, updated_at)
  values (1, _usd_to_iqd, _usd_to_aed, left(coalesce(_notes, 'Indicative FX update'), 500), auth.uid(), now())
  on conflict (id) do update
    set usd_to_iqd = excluded.usd_to_iqd,
        usd_to_aed = excluded.usd_to_aed,
        notes = excluded.notes,
        updated_by = auth.uid(),
        updated_at = now();
  return true;
end;
$$;

grant execute on function public.update_market_fx(numeric, numeric, text) to authenticated;

-- 3) Least-privilege staff notification visibility by kind.
drop policy if exists notifications_staff_select on public.notifications;
create policy notifications_staff_select on public.notifications
  for select
  using (
    public.has_staff_role(array['super_admin']::public.staff_role[])
    or (
      public.has_staff_role(array['compliance']::public.staff_role[])
      and kind in ('kyc','compliance','ops')
    )
    or (
      public.has_staff_role(array['finance']::public.staff_role[])
      and kind in ('proof','order','ops')
    )
    or (
      public.has_staff_role(array['support']::public.staff_role[])
      and kind in ('support')
    )
    or (
      public.has_staff_role(array['operations']::public.staff_role[])
      and kind in ('order','proof','ops','p2p','dispute')
    )
    or (
      public.has_staff_role(array['reviewer']::public.staff_role[])
      and kind in ('kyc','proof','ops')
    )
  );

-- 4) Login events retention helper (90 days). Schedule via pg_cron or external job.
create or replace function public.purge_old_login_events(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  if not public.has_staff_role(array['super_admin']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  perform public.require_staff_aal2();
  delete from public.login_events
  where created_at < now() - make_interval(days => greatest(retention_days, 30));
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.purge_old_login_events(integer) to authenticated;

-- 5) Indexes (idempotent).
create index if not exists orders_user_status_created_idx on public.orders (user_id, status, created_at desc);
create index if not exists kyc_cases_status_created_idx on public.kyc_cases (status, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists support_tickets_user_status_idx on public.support_tickets (user_id, status, created_at desc);
create index if not exists login_events_user_created_idx on public.login_events (user_id, created_at desc);
create index if not exists payment_proofs_order_idx on public.payment_proofs (order_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

comment on view public.market_fx_public is 'Public indicative FX rates only. No staff identity or internal notes.';
comment on function public.update_market_fx is 'Finance/Super Admin AAL2 FX update. Does not unlock LIVE_TRADING.';
comment on function public.purge_old_login_events is 'Deletes login_events older than retention_days (min 30). Super Admin + AAL2.';
