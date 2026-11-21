-- Bind each idempotency key to the exact checkout payload.
-- Reusing a key with changed details must not silently return an unrelated order.
alter table public.order_submission_requests
  add column if not exists request_hash text;

create or replace function public.submit_public_order_idempotent(
  p_request_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_customer_note text,
  p_currency text,
  p_items jsonb
) returns table(order_number text, created boolean)
language plpgsql
security definer
set search_path=pg_catalog,public,extensions,pg_temp
as $$
declare
  v_order_number text;
  v_existing_hash text;
  v_request_hash text;
begin
  if p_request_id is null then raise exception 'ORDER_REQUEST_ID_REQUIRED'; end if;

  v_request_hash := encode(digest(convert_to(jsonb_build_object(
    'customer_name',p_customer_name,
    'customer_email',p_customer_email,
    'customer_phone',p_customer_phone,
    'shipping_address',p_shipping_address,
    'customer_note',p_customer_note,
    'currency',upper(coalesce(p_currency,'')),
    'items',p_items
  )::text,'UTF8'),'sha256'),'hex');

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));

  select r.order_number,r.request_hash
    into v_order_number,v_existing_hash
  from public.order_submission_requests r
  where r.request_id=p_request_id;

  if found then
    -- Rows created before this safeguard have no stored fingerprint.
    -- Preserve their retry behavior rather than risking a duplicate order.
    if v_existing_hash is not null and v_existing_hash<>v_request_hash then
      raise exception 'ORDER_IDEMPOTENCY_KEY_REUSED';
    end if;
    return query select v_order_number,false;
    return;
  end if;

  select o.order_number into v_order_number
  from public.submit_public_order(
    p_customer_name,p_customer_email,p_customer_phone,
    p_shipping_address,p_customer_note,p_currency,p_items
  ) o;

  if v_order_number is null then raise exception 'ORDER_SUBMISSION_FAILED'; end if;

  insert into public.order_submission_requests(request_id,order_number,request_hash)
  values(p_request_id,v_order_number,v_request_hash);

  return query select v_order_number,true;
end;
$$;

revoke all on function public.submit_public_order_idempotent(uuid,text,text,text,jsonb,text,text,jsonb) from public;
grant execute on function public.submit_public_order_idempotent(uuid,text,text,text,jsonb,text,text,jsonb) to anon,authenticated;
