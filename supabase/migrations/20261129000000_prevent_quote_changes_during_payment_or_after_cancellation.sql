-- A shipping quote must not be changed while a payment is in flight,
-- after a refund, or after the order has been cancelled.
create or replace function public.create_order_shipping_quote(
  p_order_id uuid,
  p_shipping_amount numeric,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_token text;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_shipping_amount is null or p_shipping_amount < 0 or p_shipping_amount > 1000000000 then
    raise exception 'INVALID_SHIPPING_AMOUNT';
  end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.payment_status is distinct from 'unpaid'
     or v_order.status in ('cancelled','refunded') then
    raise exception 'ORDER_NOT_QUOTABLE';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  update public.orders set
    shipping_total = p_shipping_amount,
    total = subtotal + p_shipping_amount,
    shipping_quote_total = p_shipping_amount,
    shipping_quote_currency = currency,
    shipping_quote_note = nullif(left(trim(coalesce(p_note, '')), 1000), ''),
    shipping_quote_status = 'quoted',
    shipping_quote_sent_at = now(),
    shipping_quote_expires_at = now() + interval '7 days',
    shipping_quote_responded_at = null,
    shipping_quote_token_hash = encode(digest(v_token, 'sha256'), 'hex')
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'token', v_token,
    'order_number', v_order.order_number,
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'currency', v_order.currency,
    'subtotal', v_order.subtotal,
    'shipping_total', v_order.shipping_total,
    'total', v_order.total,
    'shipping_quote_note', v_order.shipping_quote_note,
    'shipping_quote_expires_at', v_order.shipping_quote_expires_at
  );
end;
$$;
revoke all on function public.create_order_shipping_quote(uuid,numeric,text) from public,anon;
grant execute on function public.create_order_shipping_quote(uuid,numeric,text) to authenticated;

create or replace function public.respond_order_shipping_quote(
  p_token text,
  p_accept boolean
) returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_token is null or length(p_token) <> 64 or p_accept is null then
    raise exception 'QUOTE_NOT_FOUND';
  end if;
  select * into v_order from public.orders
  where shipping_quote_token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if v_order.shipping_quote_status <> 'quoted'
     or v_order.payment_status is distinct from 'unpaid'
     or v_order.status in ('cancelled','refunded') then
    raise exception 'QUOTE_NOT_ACTIONABLE';
  end if;
  if v_order.shipping_quote_expires_at is null or v_order.shipping_quote_expires_at < now() then
    update public.orders set shipping_quote_status = 'expired' where id = v_order.id;
    raise exception 'QUOTE_EXPIRED';
  end if;

  update public.orders set
    shipping_quote_status = case when p_accept then 'accepted' else 'declined' end,
    shipping_quote_accepted_at = case when p_accept then now() else null end,
    shipping_quote_responded_at = now()
  where id = v_order.id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'currency', v_order.currency,
    'total', v_order.total,
    'decision', case when p_accept then 'accepted' else 'declined' end
  );
end;
$$;
revoke all on function public.respond_order_shipping_quote(text,boolean) from public;
grant execute on function public.respond_order_shipping_quote(text,boolean) to anon,authenticated;
