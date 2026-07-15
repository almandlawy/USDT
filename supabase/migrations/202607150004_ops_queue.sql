-- Operational review queue. This migration does not enable financial execution.

alter table public.kyc_cases add column if not exists assigned_to uuid references public.profiles(id);
alter table public.payment_proofs add column if not exists assigned_to uuid references public.profiles(id);
alter table public.kyc_cases add column if not exists internal_note text;
alter table public.payment_proofs add column if not exists internal_note text;

create table public.ops_notes (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('kyc','order','proof','p2p','dispute')),
  entity_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.ops_notes enable row level security;
create policy ops_notes_staff_select on public.ops_notes for select using (
  public.has_staff_role(array['super_admin','operations','compliance','finance','support','reviewer']::public.staff_role[])
);
create policy ops_notes_staff_insert on public.ops_notes for insert with check (
  author_id=(select auth.uid()) and public.has_staff_role(array['super_admin','operations','compliance','finance','support','reviewer']::public.staff_role[])
);

create trigger audit_ops_notes after insert or update or delete on public.ops_notes
for each row execute function public.audit_critical_change();

create or replace function public.assign_ops_item(_kind text, _id uuid, _assignee uuid, _note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then raise exception 'MFA_REQUIRED'; end if;
  if not public.has_staff_role(array['super_admin','operations','compliance','finance','reviewer']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.staff_roles where user_id=_assignee) then raise exception 'ASSIGNEE_NOT_STAFF'; end if;
  case _kind
    when 'kyc' then update public.kyc_cases set assigned_to=_assignee, internal_note=coalesce(left(_note,2000),internal_note) where id=_id;
    when 'order' then update public.orders set assigned_to=_assignee, internal_note=coalesce(left(_note,2000),internal_note) where id=_id;
    when 'proof' then update public.payment_proofs set assigned_to=_assignee, internal_note=coalesce(left(_note,2000),internal_note) where id=_id;
    when 'dispute' then update public.disputes set assigned_to=_assignee where id=_id;
    else raise exception 'INVALID_KIND';
  end case;
  if not found then raise exception 'NOT_FOUND'; end if;
  if nullif(trim(_note),'') is not null then insert into public.ops_notes(entity_type,entity_id,body,author_id) values(_kind,_id,left(_note,2000),auth.uid()); end if;
  insert into public.audit_logs(actor_id,actor_role,action,entity_type,entity_id,new_data)
  values(auth.uid(),'staff','assign_ops_item',_kind,_id::text,jsonb_build_object('assignee',_assignee,'note',left(_note,2000)));
  return true;
end;
$$;
grant execute on function public.assign_ops_item(text,uuid,uuid,text) to authenticated;
revoke all on function public.assign_ops_item(text,uuid,uuid,text) from public;

create index ops_notes_entity_idx on public.ops_notes(entity_type,entity_id,created_at desc);
create index kyc_cases_ops_idx on public.kyc_cases(status,assigned_to,created_at desc);
create index payment_proofs_ops_idx on public.payment_proofs(status,assigned_to,created_at desc);
create index orders_ops_idx on public.orders(status,assigned_to,created_at desc);
