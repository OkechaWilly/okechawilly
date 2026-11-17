-- Make repeated customer responses safe after a successful network retry.
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
  v_decision text;
begin
  if p_token is null or length(p_token) <> 64 or p_accept is null then
    raise exception 'QUOTE_NOT_FOUND';
  end if;
  select * into v_order from public.orders
  where shipping_quote_token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;

  v_decision := case when p_accept then 'accepted' else 'declined' end;

  if v_order.shipping_quote_status in ('accepted','declined')
     and v_order.shipping_quote_status=v_decision
     and v_order.payment_status='unpaid'
     and v_order.status not in ('cancelled','refunded') then
    return jsonb_build_object(
      'order_number',v_order.order_number,
      'customer_name',v_order.customer_name,
      'customer_email',v_order.customer_email,
      'currency',v_order.currency,
      'total',v_order.total,
      'decision',v_decision,
      'reused',true
    );
  end if;

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
    shipping_quote_status = v_decision,
    shipping_quote_accepted_at = case when p_accept then now() else null end,
    shipping_quote_responded_at = now()
  where id = v_order.id;

  return jsonb_build_object(
    'order_number',v_order.order_number,
    'customer_name',v_order.customer_name,
    'customer_email',v_order.customer_email,
    'currency',v_order.currency,
    'total',v_order.total,
    'decision',v_decision,
    'reused',false
  );
end;
$$;
revoke all on function public.respond_order_shipping_quote(text,boolean) from public;
grant execute on function public.respond_order_shipping_quote(text,boolean) to anon,authenticated;
