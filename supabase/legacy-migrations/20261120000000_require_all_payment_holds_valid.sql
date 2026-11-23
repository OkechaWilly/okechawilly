-- Require every active inventory hold for an order to remain valid at payment completion.
-- Historical released holds from earlier payment attempts are intentionally ignored.
create or replace function public.complete_flutterwave_payment(
  p_tx_ref text,
  p_transaction_id text,
  p_amount numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_reservation record;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_order
  from public.orders
  where payment_reference=p_tx_ref and payment_provider='flutterwave'
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  if v_order.payment_status='paid' then
    return jsonb_build_object(
      'order_number',v_order.order_number,
      'customer_name',v_order.customer_name,
      'customer_email',v_order.customer_email,
      'payment_status','paid',
      'already_paid',true
    );
  end if;

  if v_order.payment_status <> 'pending'
     or p_amount is distinct from v_order.total
     or upper(coalesce(p_currency,'')) <> upper(v_order.currency)
     or p_transaction_id is null then
    raise exception 'PAYMENT_DETAILS_MISMATCH';
  end if;

  -- A payment must not complete if any hold belonging to the current active
  -- attempt has expired. Earlier attempts' released rows are not considered.
  if not exists (
    select 1 from public.order_stock_reservations
    where order_id=v_order.id
      and released_at is null
      and consumed_at is null
      and expires_at>now()
  ) or exists (
    select 1 from public.order_stock_reservations
    where order_id=v_order.id
      and released_at is null
      and consumed_at is null
      and expires_at<=now()
  ) then
    raise exception 'PAYMENT_STOCK_RESERVATION_EXPIRED';
  end if;

  for v_reservation in
    select * from public.order_stock_reservations
    where order_id=v_order.id
      and released_at is null
      and consumed_at is null
      and expires_at>now()
    for update
  loop
    if v_reservation.variant_id is not null then
      update public.product_variants
      set stock_quantity=case when stock_quantity is null then null else stock_quantity-v_reservation.quantity end
      where id=v_reservation.variant_id
        and (stock_quantity is null or stock_quantity>=v_reservation.quantity);
      if not found then raise exception 'PAYMENT_STOCK_CHANGED'; end if;
    elsif exists (
      select 1 from public.products
      where id=v_reservation.product_id and track_inventory and stock_quantity is not null
    ) then
      update public.products
      set stock_quantity=stock_quantity-v_reservation.quantity
      where id=v_reservation.product_id and stock_quantity>=v_reservation.quantity;
      if not found then raise exception 'PAYMENT_STOCK_CHANGED'; end if;
    end if;

    update public.products
    set edition_sold=edition_sold+v_reservation.quantity
    where id=v_reservation.product_id
      and product_type='limited_print'
      and edition_size is not null;

    update public.order_stock_reservations
    set consumed_at=now()
    where id=v_reservation.id;
  end loop;

  update public.orders
  set payment_status='paid',
      payment_transaction_id=p_transaction_id,
      payment_checkout_url=null,
      payment_checkout_expires_at=null
  where id=v_order.id;

  return jsonb_build_object(
    'order_number',v_order.order_number,
    'customer_name',v_order.customer_name,
    'customer_email',v_order.customer_email,
    'payment_status','paid',
    'already_paid',false
  );
end;
$$;

revoke all on function public.complete_flutterwave_payment(text,text,numeric,text) from public;
grant execute on function public.complete_flutterwave_payment(text,text,numeric,text) to service_role;
