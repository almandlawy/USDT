-- Customer notifications, KYC rejected resubmit path, staff notification visibility,
-- and append-only audit for indicative FX settings. Does not unlock LIVE_TRADING.

-- Allow customers to reopen a rejected or resubmission_required KYC case as draft/submitted.
drop policy if exists kyc_owner_update on public.kyc_cases;
create policy kyc_owner_update on public.kyc_cases
  for update
  using (
    user_id = (select auth.uid())
    and status in ('draft', 'resubmission_required', 'rejected')
  )
  with check (
    user_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and reviewer_id is null
    and reviewed_at is null
  );

-- Staff may list notifications for operations visibility (owner still owns updates).
drop policy if exists notifications_staff_select on public.notifications;
create policy notifications_staff_select on public.notifications
  for select
  using (public.has_staff_role(array['super_admin','operations','compliance','finance','support','reviewer']::public.staff_role[]));

-- Notify the customer when their KYC case decision changes.
create or replace function public.notify_customer_kyc_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status in ('approved', 'rejected', 'resubmission_required', 'under_review')
  then
    insert into public.notifications (user_id, title_ar, title_en, body_ar, body_en, kind, link)
    values (
      new.user_id,
      case new.status
        when 'approved' then 'تم قبول التحقق'
        when 'rejected' then 'تم رفض التحقق'
        when 'resubmission_required' then 'يلزم إعادة تقديم التحقق'
        else 'تحديث حالة التحقق'
      end,
      case new.status
        when 'approved' then 'Verification approved'
        when 'rejected' then 'Verification rejected'
        when 'resubmission_required' then 'Verification resubmission required'
        else 'Verification status updated'
      end,
      case new.status
        when 'approved' then 'يمكنك الآن إنشاء طلب مراجعة تجريبي.'
        when 'rejected' then 'راجع السبب الظاهر للعميل وأعد التقديم عند الحاجة.'
        when 'resubmission_required' then 'أكمل المستندات المطلوبة وأعد الإرسال.'
        else 'ملفك قيد المراجعة حالياً.'
      end,
      case new.status
        when 'approved' then 'You can now create a demo review request.'
        when 'rejected' then 'Review the customer-visible reason and resubmit if needed.'
        when 'resubmission_required' then 'Complete the required documents and resubmit.'
        else 'Your file is currently under review.'
      end,
      'kyc',
      '/dashboard/kyc'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_customer_kyc_decision on public.kyc_cases;
create trigger notify_customer_kyc_decision
  after update on public.kyc_cases
  for each row execute function public.notify_customer_kyc_decision();

-- Notify the customer when their order status changes (safe customer-facing statuses only).
create or replace function public.notify_customer_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status in (
       'awaiting_kyc','awaiting_payment','proof_uploaded','under_review',
       'payment_confirmed','compliance_hold','approved','cancelled','rejected','refund_required'
     )
  then
    insert into public.notifications (user_id, title_ar, title_en, body_ar, body_en, kind, link)
    values (
      new.user_id,
      'تحديث حالة الطلب',
      'Request status updated',
      'تم تحديث حالة الطلب ' || coalesce(new.reference_number, left(new.id::text, 8)) || '.',
      'Request ' || coalesce(new.reference_number, left(new.id::text, 8)) || ' status was updated.',
      'order',
      '/dashboard/orders/' || new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_customer_order_status on public.orders;
create trigger notify_customer_order_status
  after update on public.orders
  for each row execute function public.notify_customer_order_status();

create or replace function public.notify_customer_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title_ar, title_en, body_ar, body_en, kind, link)
  values (
    new.user_id,
    'تم إنشاء طلب المراجعة',
    'Review request created',
    'تم إنشاء طلبك ' || coalesce(new.reference_number, left(new.id::text, 8)) || ' وهو قيد المتابعة الإدارية.',
    'Your request ' || coalesce(new.reference_number, left(new.id::text, 8)) || ' was created and is under administrative follow-up.',
    'order',
    '/dashboard/orders/' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists notify_customer_order_created on public.orders;
create trigger notify_customer_order_created
  after insert on public.orders
  for each row execute function public.notify_customer_order_created();

-- Notify the customer when a payment proof decision is recorded.
create or replace function public.notify_customer_proof_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status in ('approved', 'rejected', 'resubmission_required', 'under_review')
  then
    insert into public.notifications (user_id, title_ar, title_en, body_ar, body_en, kind, link)
    values (
      new.user_id,
      'تحديث إثبات الدفع',
      'Payment proof updated',
      'تمت مراجعة إثبات الدفع المرتبط بطلبك.',
      'Your payment proof has been reviewed.',
      'proof',
      '/dashboard/proofs'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_customer_proof_decision on public.payment_proofs;
create trigger notify_customer_proof_decision
  after update on public.payment_proofs
  for each row execute function public.notify_customer_proof_decision();

-- Keep ticket waiting state in sync and notify customers on staff replies.
create or replace function public.notify_customer_ticket_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ticket_owner uuid;
  is_staff boolean;
begin
  select user_id into ticket_owner from public.support_tickets where id = new.ticket_id;
  if ticket_owner is null then
    return new;
  end if;
  select exists(
    select 1 from public.staff_roles where user_id = new.author_id
  ) into is_staff;

  if is_staff and ticket_owner <> new.author_id and coalesce(new.internal, false) = false then
    insert into public.notifications (user_id, title_ar, title_en, body_ar, body_en, kind, link)
    values (
      ticket_owner,
      'رد جديد من الدعم',
      'New support reply',
      'وصل رد جديد على تذكرة الدعم الخاصة بك.',
      'There is a new reply on your support ticket.',
      'support',
      '/dashboard/support/' || new.ticket_id::text
    );
    update public.support_tickets
      set status = 'waiting_customer', updated_at = now()
      where id = new.ticket_id
        and status in ('open', 'waiting_staff');
  elsif not is_staff and ticket_owner = new.author_id then
    update public.support_tickets
      set status = 'waiting_staff', updated_at = now()
      where id = new.ticket_id
        and status in ('open', 'waiting_customer', 'waiting_staff');
  end if;
  return new;
end;
$$;

drop trigger if exists notify_customer_ticket_reply on public.ticket_messages;
create trigger notify_customer_ticket_reply
  after insert on public.ticket_messages
  for each row execute function public.notify_customer_ticket_reply();

-- Audit indicative FX updates (append-only audit_logs).
drop trigger if exists audit_market_fx_settings on public.market_fx_settings;
create trigger audit_market_fx_settings
  after insert or update on public.market_fx_settings
  for each row execute function public.audit_critical_change();

comment on function public.notify_customer_kyc_decision is 'Creates customer-safe in-app notifications for KYC status changes.';
comment on function public.notify_customer_order_status is 'Creates customer-safe in-app notifications for order status changes. Never enables financial settlement.';
comment on policy kyc_owner_update on public.kyc_cases is 'Customers may reopen rejected or resubmission_required cases as draft/submitted only.';
