-- Record provider-confirmed payments that cannot be safely completed automatically.
-- This is a reconciliation queue, not an automatic payment/refund action.
create table if not exists public.payment_reconciliation_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_number text not null,
  tx_ref text not null unique,
  transaction_id text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null check (currency in ('UGX','USD')),
  reason text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review','refund_initiated','refunded','dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists payment_reconciliation_status_created_idx
  on public.payment_reconciliation_cases(status, created_at desc);

alter table public.payment_reconciliation_cases enable row level security;
revoke all on public.payment_reconciliation_cases from public, anon;
grant select on public.payment_reconciliation_cases to authenticated;


drop policy if exists "Admins can view payment reconciliation cases" on public.payment_reconciliation_cases;
create policy "Admins can view payment reconciliation cases"
  on public.payment_reconciliation_cases for select to authenticated
  using (public.is_admin());


create or replace function public.record_flutterwave_reconciliation(
  p_tx_ref text,
  p_transaction_id text,
  p_amount numeric,
  p_currency text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_case public.payment_reconciliation_cases%rowtype;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_tx_ref is null or p_transaction_id is null
     or p_amount is null or p_amount < 0
     or upper(coalesce(p_currency,'')) not in ('UGX','USD')
     or p_reason not in ('PAYMENT_STOCK_RESERVATION_EXPIRED','PAYMENT_STOCK_CHANGED','PAYMENT_DETAILS_MISMATCH','PAYMENT_SESSION_RELEASED_AFTER_PROVIDER_CHECK') then
    raise exception 'RECONCILIATION_INVALID_DETAILS';
  end if;

  select * into v_order from public.orders
  where payment_reference=p_tx_ref and payment_provider='flutterwave'
  for update;
  if not found then
    -- A hosted link may complete after Studio has verified an expired session
    -- and released it. Keep the original reference auditable and reconcile it.
    select o.* into v_order
    from public.orders o
    join public.payment_session_events e on e.order_id=o.id
    where e.payment_reference=p_tx_ref
    order by e.created_at desc
    limit 1
    for update of o;
    if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  end if;

  insert into public.payment_reconciliation_cases(
    order_id,order_number,tx_ref,transaction_id,amount,currency,reason
  ) values (
    v_order.id,v_order.order_number,p_tx_ref,p_transaction_id,p_amount,upper(p_currency),p_reason
  )
  on conflict (tx_ref) do update set
    transaction_id=excluded.transaction_id,
    amount=excluded.amount,
    currency=excluded.currency,
    reason=excluded.reason,
    updated_at=now()
  where public.payment_reconciliation_cases.status='pending_review'
  returning * into v_case;

  if not found then
    select * into v_case from public.payment_reconciliation_cases where tx_ref=p_tx_ref;
  end if;

  return jsonb_build_object(
    'case_id',v_case.id,
    'order_number',v_case.order_number,
    'status',v_case.status
  );
end;
$$;

revoke all on function public.record_flutterwave_reconciliation(text,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.record_flutterwave_reconciliation(text,text,numeric,text,text) to service_role;

-- Resolve a case and update the linked order's payment state atomically.
-- Refund execution itself remains a manual provider-dashboard operation.
create or replace function public.resolve_payment_reconciliation_case(
  p_case_id uuid,
  p_outcome text,
  p_admin_note text default null
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_case public.payment_reconciliation_cases%rowtype;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_outcome is null or p_outcome not in ('refund_initiated','refunded','dismissed') then
    raise exception 'RECONCILIATION_INVALID_OUTCOME';
  end if;

  select * into v_case from public.payment_reconciliation_cases
  where id=p_case_id for update;
  if not found then raise exception 'RECONCILIATION_CASE_NOT_FOUND'; end if;
  if v_case.status=p_outcome then
    return jsonb_build_object('case_id',v_case.id,'order_number',v_case.order_number,'status',v_case.status);
  end if;
  if (p_outcome='refund_initiated' and v_case.status<>'pending_review')
     or (p_outcome='dismissed' and v_case.status<>'pending_review')
     or (p_outcome='refunded' and v_case.status not in ('pending_review','refund_initiated')) then
    raise exception 'RECONCILIATION_CASE_ALREADY_RESOLVED';
  end if;

  if p_outcome='refunded' then
    update public.orders set payment_status='refunded'
    where id=v_case.order_id and payment_status not in ('paid','refunded');
    if not found then
      if not exists(select 1 from public.orders where id=v_case.order_id and payment_status='refunded') then
        raise exception 'RECONCILIATION_ORDER_STATE_MISMATCH';
      end if;
    end if;
  end if;

  update public.payment_reconciliation_cases
  set status=p_outcome,
      admin_note=nullif(left(trim(coalesce(p_admin_note,'')),1000),''),
      updated_at=now(),
      resolved_at=case when p_outcome in ('refunded','dismissed') then now() else null end
  where id=p_case_id
  returning * into v_case;

  return jsonb_build_object('case_id',v_case.id,'order_number',v_case.order_number,'status',v_case.status);
end;
$$;

revoke all on function public.resolve_payment_reconciliation_case(uuid,text,text) from public,anon;
grant execute on function public.resolve_payment_reconciliation_case(uuid,text,text) to authenticated;

-- Auditable recovery for an expired hosted checkout session. The admin must
-- verify in Flutterwave that no successful charge exists before releasing it.
create table if not exists public.payment_session_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_number text not null,
  payment_reference text not null,
  action text not null check (action in ('released_after_provider_check')),
  admin_note text not null,
  created_at timestamptz not null default now()
);
alter table public.payment_session_events enable row level security;
revoke all on public.payment_session_events from public,anon,authenticated;
grant select on public.payment_session_events to authenticated;
drop policy if exists "Admins can view payment session events" on public.payment_session_events;
create policy "Admins can view payment session events"
  on public.payment_session_events for select to authenticated using (public.is_admin());

create or replace function public.release_expired_flutterwave_session(
  p_order_id uuid,
  p_admin_note text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if length(trim(coalesce(p_admin_note,''))) < 12 then
    raise exception 'PAYMENT_RECOVERY_NOTE_REQUIRED';
  end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.payment_status is distinct from 'pending' or v_order.payment_provider is distinct from 'flutterwave'
     or v_order.payment_reference is null or v_order.payment_checkout_expires_at is null
     or v_order.payment_checkout_expires_at>now() then
    raise exception 'PAYMENT_SESSION_NOT_EXPIRED';
  end if;

  insert into public.payment_session_events(order_id,order_number,payment_reference,action,admin_note)
  values(v_order.id,v_order.order_number,v_order.payment_reference,'released_after_provider_check',left(trim(p_admin_note),1000));

  update public.order_stock_reservations
  set released_at=now()
  where order_id=v_order.id and released_at is null and consumed_at is null;

  update public.orders
  set payment_status='unpaid',payment_provider=null,payment_reference=null,
      payment_checkout_url=null,payment_checkout_expires_at=null
  where id=v_order.id;

  return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,'payment_status','unpaid');
end;
$$;
revoke all on function public.release_expired_flutterwave_session(uuid,text) from public,anon;
grant execute on function public.release_expired_flutterwave_session(uuid,text) to authenticated;
