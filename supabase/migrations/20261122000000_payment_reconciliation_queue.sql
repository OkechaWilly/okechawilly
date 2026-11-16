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
    check (status in ('pending_review','fulfilled','refund_initiated','refunded','dismissed')),
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
grant update (status,admin_note,updated_at,resolved_at) on public.payment_reconciliation_cases to authenticated;

drop policy if exists "Admins can view payment reconciliation cases" on public.payment_reconciliation_cases;
create policy "Admins can view payment reconciliation cases"
  on public.payment_reconciliation_cases for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update payment reconciliation cases" on public.payment_reconciliation_cases;
create policy "Admins can update payment reconciliation cases"
  on public.payment_reconciliation_cases for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
     or p_reason not in ('PAYMENT_STOCK_RESERVATION_EXPIRED','PAYMENT_STOCK_CHANGED') then
    raise exception 'RECONCILIATION_INVALID_DETAILS';
  end if;

  select * into v_order from public.orders
  where payment_reference=p_tx_ref and payment_provider='flutterwave'
  for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;

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
