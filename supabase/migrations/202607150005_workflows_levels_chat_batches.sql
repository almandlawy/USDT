-- Demo workflow, tier limits, request chat and operational batches.
-- No settlement, custody, deposit, payout or automatic release is introduced.

alter table public.profiles add column if not exists kyc_level smallint not null default 0 check (kyc_level between 0 and 3);
alter table public.orders add column if not exists quote_status text not null default 'quoted' check (quote_status in ('requested','quoted','accepted','rejected','expired'));
alter table public.orders add column if not exists quote_accepted_at timestamptz;

create table public.kyc_level_limits (
  level smallint not null check(level between 0 and 3),
  fiat_currency text not null check(fiat_currency in ('USD','AED','IQD')),
  per_order_limit numeric(20,2) not null check(per_order_limit>=0),
  daily_limit numeric(20,2) not null check(daily_limit>=per_order_limit),
  description_ar text not null,
  description_en text not null,
  primary key(level,fiat_currency)
);
insert into public.kyc_level_limits values
 (0,'USD',0,0,'أكمل التحقق الأولي','Complete initial verification'),(0,'AED',0,0,'أكمل التحقق الأولي','Complete initial verification'),(0,'IQD',0,0,'أكمل التحقق الأولي','Complete initial verification'),
 (1,'USD',500,1000,'بريد وهاتف موثقان','Verified email and phone'),(1,'AED',1800,3600,'بريد وهاتف موثقان','Verified email and phone'),(1,'IQD',650000,1300000,'بريد وهاتف موثقان','Verified email and phone'),
 (2,'USD',10000,25000,'هوية أساسية مقبولة','Basic identity approved'),(2,'AED',36700,90000,'هوية أساسية مقبولة','Basic identity approved'),(2,'IQD',13000000,30000000,'هوية أساسية مقبولة','Basic identity approved'),
 (3,'USD',50000,100000,'ملف معزز أو شركة','Enhanced or business file'),(3,'AED',183500,367000,'ملف معزز أو شركة','Enhanced or business file'),(3,'IQD',65000000,130000000,'ملف معزز أو شركة','Enhanced or business file')
on conflict do nothing;

create table public.order_messages (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.orders(id) on delete cascade,
 author_id uuid references public.profiles(id),
 message text not null check(char_length(message) between 1 and 3000),
 system_message boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.review_batches (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 side public.order_type not null check(side in ('buy','sell')),
 status text not null default 'open' check(status in ('open','in_progress','closed')),
 assigned_to uuid references public.profiles(id),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 closed_at timestamptz
);
create table public.review_batch_items (
 batch_id uuid not null references public.review_batches(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete restrict,
 added_by uuid not null references public.profiles(id),
 added_at timestamptz not null default now(),
 primary key(batch_id,order_id)
);

alter table public.kyc_level_limits enable row level security;
alter table public.order_messages enable row level security;
alter table public.review_batches enable row level security;
alter table public.review_batch_items enable row level security;
create policy level_limits_authenticated_read on public.kyc_level_limits for select to authenticated using(true);
create policy level_limits_compliance_manage on public.kyc_level_limits for all using(public.has_staff_role(array['super_admin','compliance']::public.staff_role[])) with check(public.has_staff_role(array['super_admin','compliance']::public.staff_role[]));
create policy order_messages_participant_read on public.order_messages for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=(select auth.uid()) or public.has_staff_role(array['super_admin','operations','compliance','finance','support','reviewer']::public.staff_role[]))));
create policy order_messages_participant_insert on public.order_messages for insert with check(author_id=(select auth.uid()) and exists(select 1 from public.orders o where o.id=order_id and (o.user_id=(select auth.uid()) or public.has_staff_role(array['super_admin','operations','support']::public.staff_role[]))));
create policy review_batches_staff_all on public.review_batches for all using(public.has_staff_role(array['super_admin','operations','reviewer']::public.staff_role[])) with check(public.has_staff_role(array['super_admin','operations','reviewer']::public.staff_role[]));
create policy review_batch_items_staff_all on public.review_batch_items for all using(public.has_staff_role(array['super_admin','operations','reviewer']::public.staff_role[])) with check(public.has_staff_role(array['super_admin','operations','reviewer']::public.staff_role[]));

create trigger audit_level_limits after insert or update or delete on public.kyc_level_limits for each row execute function public.audit_critical_change();
create trigger audit_order_messages after insert or update or delete on public.order_messages for each row execute function public.audit_critical_change();
create trigger audit_review_batches after insert or update or delete on public.review_batches for each row execute function public.audit_critical_change();

create or replace function public.accept_demo_quote(_order_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare o public.orders;
begin
 select * into o from public.orders where id=_order_id and user_id=auth.uid() for update;
 if o.id is null then raise exception 'NOT_FOUND'; end if;
 if o.quote_status <> 'quoted' then raise exception 'QUOTE_NOT_AVAILABLE'; end if;
 if o.quote_expires_at <= now() then update public.orders set quote_status='expired' where id=_order_id; raise exception 'QUOTE_EXPIRED'; end if;
 update public.orders set quote_status='accepted',quote_accepted_at=now() where id=_order_id;
 insert into public.order_messages(order_id,author_id,message,system_message) values(_order_id,auth.uid(),'Demo quote accepted by customer',true);
 return true;
end;$$;
grant execute on function public.accept_demo_quote(uuid) to authenticated;
revoke all on function public.accept_demo_quote(uuid) from public;

create or replace function public.sync_kyc_level()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='approved' then
   update public.profiles set kyc_level=case when new.account_type='business' then 3 else greatest(kyc_level,2) end where id=new.user_id;
 end if;
 return new;
end;$$;
create trigger kyc_level_after_review after update of status on public.kyc_cases for each row execute function public.sync_kyc_level();

create or replace function public.enforce_demo_level_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare lvl smallint; lim numeric; used numeric;
begin
 select kyc_level into lvl from public.profiles where id=new.user_id;
 select least(per_order_limit,daily_limit) into lim from public.kyc_level_limits where level=lvl and fiat_currency=new.fiat_currency;
 select coalesce(sum(amount_fiat),0) into used from public.orders where user_id=new.user_id and fiat_currency=new.fiat_currency and created_at>=date_trunc('day',now()) and status not in ('cancelled','rejected');
 if lim is null or new.amount_fiat>lim or used+new.amount_fiat>(select daily_limit from public.kyc_level_limits where level=lvl and fiat_currency=new.fiat_currency) then raise exception 'KYC_LEVEL_LIMIT_EXCEEDED'; end if;
 return new;
end;$$;
create trigger orders_level_limit before insert on public.orders for each row execute function public.enforce_demo_level_limit();

create index order_messages_order_idx on public.order_messages(order_id,created_at);
create index review_batches_status_idx on public.review_batches(side,status,created_at desc);

create or replace function public.notify_ops_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid;
begin
 for recipient in select distinct user_id from public.staff_roles where role in ('super_admin','operations','compliance','finance','reviewer') loop
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en,kind,link)
  values(recipient,'عنصر جديد في غرفة العمليات','New operations item',tg_table_name||' يحتاج مراجعة',tg_table_name||' requires review','ops','/admin/ops');
 end loop;
 return new;
end;$$;
create trigger notify_new_kyc after insert on public.kyc_cases for each row execute function public.notify_ops_event();
create trigger notify_new_order after insert on public.orders for each row execute function public.notify_ops_event();
create trigger notify_new_proof after insert on public.payment_proofs for each row execute function public.notify_ops_event();
create trigger notify_new_dispute after insert on public.disputes for each row execute function public.notify_ops_event();
