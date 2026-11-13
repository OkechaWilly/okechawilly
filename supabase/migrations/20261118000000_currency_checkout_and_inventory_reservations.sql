-- Enforce the selected market currency in the database and reserve stock atomically for payment.
-- Existing legacy submit RPC is removed so callers cannot bypass currency-specific prices.
drop function if exists public.submit_public_order(text,text,text,jsonb,text,jsonb);

create or replace function public.submit_public_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_customer_note text,
  p_currency text,
  p_items jsonb
)
returns table(order_number text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_currency text := upper(coalesce(p_currency, ''));
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_variant_label text;
  v_sku text;
begin
  if v_currency not in ('UGX','USD')
     or length(trim(coalesce(p_customer_name, ''))) not between 1 and 120
     or length(trim(coalesce(p_customer_email, ''))) not between 3 and 254
     or position('@' in coalesce(p_customer_email, '')) < 2
     or length(trim(coalesce(p_customer_phone, ''))) not between 5 and 40
     or p_shipping_address is null
     or jsonb_typeof(p_shipping_address) is distinct from 'object'
     or length(trim(coalesce(p_shipping_address->>'country', ''))) not between 2 and 80
     or length(trim(coalesce(p_shipping_address->>'address', ''))) not between 3 and 300
     or length(trim(coalesce(p_shipping_address->>'city', ''))) not between 1 and 100
     or p_items is null
     or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'ORDER_INVALID_DETAILS';
  end if;

  v_order_number := 'OW-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  insert into public.orders(order_number,customer_name,customer_email,customer_phone,currency,subtotal,shipping_total,total,shipping_address,customer_note,status,payment_status,shipping_quote_status)
  values(v_order_number,trim(p_customer_name),lower(trim(p_customer_email)),trim(p_customer_phone),v_currency,0,0,0,p_shipping_address,nullif(trim(coalesce(p_customer_note,'')),''),'pending','unpaid','pending')
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) is distinct from 'object' or (v_item->>'productId') is null or (v_item->>'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'ORDER_INVALID_ITEM';
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 20 then raise exception 'ORDER_INVALID_QUANTITY'; end if;

    select * into v_product from public.products p where p.id=(v_item->>'productId')::uuid for update;
    if not found or not v_product.is_published or v_product.status <> 'active' then raise exception 'ORDER_PRODUCT_UNAVAILABLE'; end if;

    v_variant_id := nullif(v_item->>'variantId','')::uuid;
    v_variant_label := null;
    v_sku := v_product.sku;
    if v_variant_id is not null then
      select * into v_variant from public.product_variants pv where pv.id=v_variant_id and pv.product_id=v_product.id for update;
      if not found or not v_variant.is_available then raise exception 'ORDER_VARIANT_UNAVAILABLE'; end if;
      if v_variant.stock_quantity is not null and v_variant.stock_quantity < v_quantity then raise exception 'ORDER_STOCK_CHANGED'; end if;
      v_unit_price := case when v_currency='UGX' then coalesce(v_variant.price_ugx,case when upper(coalesce(v_variant.currency,'UGX'))='UGX' then v_variant.price end) else coalesce(v_variant.price_usd,case when upper(coalesce(v_variant.currency,'UGX'))='USD' then v_variant.price end) end;
      v_variant_label := v_variant.label;
    else
      if exists(select 1 from public.product_variants pv where pv.product_id=v_product.id) then raise exception 'ORDER_SELECT_FORMAT'; end if;
      v_unit_price := case when v_currency='UGX' then coalesce(v_product.price_ugx,case when upper(coalesce(v_product.currency,'UGX'))='UGX' then v_product.price end) else coalesce(v_product.price_usd,case when upper(coalesce(v_product.currency,'UGX'))='USD' then v_product.price end) end;
      if v_unit_price is null then raise exception 'ORDER_PRICE_NOT_SET_FOR_CURRENCY'; end if;
      if v_product.track_inventory and v_product.stock_quantity is not null and v_product.stock_quantity < v_quantity then raise exception 'ORDER_STOCK_CHANGED'; end if;
    end if;
    if v_unit_price is null then raise exception 'ORDER_PRICE_NOT_SET_FOR_CURRENCY'; end if;
    if v_product.product_type='limited_print' and v_product.edition_size is not null and v_product.edition_size-v_product.edition_sold < v_quantity then raise exception 'ORDER_EDITION_UNAVAILABLE'; end if;

    insert into public.order_items(order_id,product_id,product_title,sku,quantity,unit_price,line_total,selected_options)
    values(v_order_id,v_product.id,v_product.title,v_sku,v_quantity,v_unit_price,v_unit_price*v_quantity,jsonb_strip_nulls(jsonb_build_object('variant_id',v_variant_id,'variant_label',v_variant_label)));
    v_subtotal := v_subtotal + v_unit_price*v_quantity;
  end loop;

  update public.orders set subtotal=v_subtotal,total=v_subtotal where id=v_order_id;
  return query select v_order_number;
exception when invalid_text_representation then raise exception 'ORDER_INVALID_ITEM';
end;
$$;
revoke all on function public.submit_public_order(text,text,text,jsonb,text,text,jsonb) from public;
grant execute on function public.submit_public_order(text,text,text,jsonb,text,text,jsonb) to anon,authenticated;

-- Release expired holds as part of every new payment attempt.
create or replace function public.prepare_flutterwave_payment(p_token text,p_tx_ref text)
returns jsonb language plpgsql security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_line record;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_reserved integer;
begin
  if p_token is null or length(p_token)<>64 or p_tx_ref is null or length(p_tx_ref) not between 10 and 120 then raise exception 'PAYMENT_INVALID_REQUEST'; end if;
  update public.order_stock_reservations set released_at=now() where released_at is null and consumed_at is null and expires_at<=now();
  select * into v_order from public.orders where shipping_quote_token_hash=encode(digest(p_token,'sha256'),'hex') for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if v_order.shipping_quote_status<>'accepted' then raise exception 'QUOTE_NOT_ACCEPTED'; end if;
  if v_order.payment_status='paid' then raise exception 'ORDER_ALREADY_PAID'; end if;
  if v_order.total<=0 then raise exception 'PAYMENT_INVALID_TOTAL'; end if;
  if v_order.payment_status='pending' and v_order.payment_checkout_expires_at>now() then raise exception 'PAYMENT_ALREADY_PENDING'; end if;
  if v_order.payment_status='pending' then
    update public.order_stock_reservations set released_at=now() where order_id=v_order.id and released_at is null and consumed_at is null;
    update public.orders set payment_status='unpaid',payment_provider=null,payment_reference=null,payment_checkout_url=null,payment_checkout_expires_at=null where id=v_order.id;
  end if;

  for v_line in
    select oi.product_id,nullif(oi.selected_options->>'variant_id','')::uuid as variant_id,sum(oi.quantity)::integer as quantity
    from public.order_items oi where oi.order_id=v_order.id
    group by oi.product_id,nullif(oi.selected_options->>'variant_id','')
    order by oi.product_id
  loop
    select * into v_product from public.products where id=v_line.product_id for update;
    if not found or not v_product.is_published or v_product.status<>'active' then raise exception 'ORDER_PRODUCT_UNAVAILABLE'; end if;
    if v_line.variant_id is not null then
      select * into v_variant from public.product_variants where id=v_line.variant_id and product_id=v_product.id for update;
      if not found or not v_variant.is_available then raise exception 'ORDER_VARIANT_UNAVAILABLE'; end if;
      select coalesce(sum(quantity),0)::integer into v_reserved from public.order_stock_reservations
      where variant_id=v_variant.id and released_at is null and consumed_at is null and expires_at>now();
      if v_variant.stock_quantity is not null and v_variant.stock_quantity-v_reserved<v_line.quantity then raise exception 'ORDER_STOCK_CHANGED'; end if;
    elsif v_product.track_inventory and v_product.stock_quantity is not null then
      select coalesce(sum(quantity),0)::integer into v_reserved from public.order_stock_reservations
      where product_id=v_product.id and variant_id is null and released_at is null and consumed_at is null and expires_at>now();
      if v_product.stock_quantity-v_reserved<v_line.quantity then raise exception 'ORDER_STOCK_CHANGED'; end if;
    end if;
    if v_product.product_type='limited_print' and v_product.edition_size is not null then
      select coalesce(sum(quantity),0)::integer into v_reserved from public.order_stock_reservations
      where product_id=v_product.id and released_at is null and consumed_at is null and expires_at>now();
      if v_product.edition_size-v_product.edition_sold-v_reserved<v_line.quantity then raise exception 'ORDER_EDITION_UNAVAILABLE'; end if;
    end if;
    insert into public.order_stock_reservations(order_id,product_id,variant_id,quantity,expires_at)
    values(v_order.id,v_product.id,v_line.variant_id,v_line.quantity,now()+interval '30 minutes');
  end loop;

  update public.orders set payment_status='pending',payment_provider='flutterwave',payment_reference=p_tx_ref,payment_checkout_url=null,payment_checkout_expires_at=now()+interval '30 minutes' where id=v_order.id;
  return jsonb_build_object('order_number',v_order.order_number,'customer_name',v_order.customer_name,'customer_email',v_order.customer_email,'customer_phone',v_order.customer_phone,'currency',v_order.currency,'amount',v_order.total);
end;
$$;

create or replace function public.reset_flutterwave_payment(p_tx_ref text)
returns boolean language plpgsql security definer set search_path=public,pg_temp
as $
declare v_order_id uuid;
begin
  select id into v_order_id from public.orders where payment_reference=p_tx_ref and payment_status='pending' for update;
  if not found then return false; end if;
  update public.order_stock_reservations set released_at=now() where order_id=v_order_id and released_at is null and consumed_at is null;
  update public.orders set payment_status='unpaid',payment_provider=null,payment_reference=null,payment_checkout_url=null,payment_checkout_expires_at=null where id=v_order_id and payment_status='pending';
  return found;
end;
$;

create or replace function public.complete_flutterwave_payment(p_tx_ref text,p_transaction_id text,p_amount numeric,p_currency text)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_reservation record;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'NOT_AUTHORIZED'; end if;
  select * into v_order from public.orders where payment_reference=p_tx_ref and payment_provider='flutterwave' for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_order.payment_status='paid' then return jsonb_build_object('order_number',v_order.order_number,'customer_name',v_order.customer_name,'customer_email',v_order.customer_email,'payment_status','paid'); end if;
  if v_order.payment_status<>'pending' or p_amount is distinct from v_order.total or upper(coalesce(p_currency,''))<>upper(v_order.currency) or p_transaction_id is null then raise exception 'PAYMENT_DETAILS_MISMATCH'; end if;
  if not exists(select 1 from public.order_stock_reservations where order_id=v_order.id and released_at is null and consumed_at is null and expires_at>now()) then raise exception 'PAYMENT_STOCK_RESERVATION_EXPIRED'; end if;

  for v_reservation in select * from public.order_stock_reservations where order_id=v_order.id and released_at is null and consumed_at is null for update
  loop
    if v_reservation.variant_id is not null then
      update public.product_variants set stock_quantity=case when stock_quantity is null then null else stock_quantity-v_reservation.quantity end
      where id=v_reservation.variant_id and (stock_quantity is null or stock_quantity>=v_reservation.quantity);
      if not found then raise exception 'PAYMENT_STOCK_CHANGED'; end if;
    elsif exists(select 1 from public.products where id=v_reservation.product_id and track_inventory and stock_quantity is not null) then
      update public.products set stock_quantity=stock_quantity-v_reservation.quantity
      where id=v_reservation.product_id and stock_quantity>=v_reservation.quantity;
      if not found then raise exception 'PAYMENT_STOCK_CHANGED'; end if;
    end if;
    update public.products set edition_sold=edition_sold+v_reservation.quantity
    where id=v_reservation.product_id and product_type='limited_print' and edition_size is not null;
    update public.order_stock_reservations set consumed_at=now() where id=v_reservation.id;
  end loop;
  update public.orders set payment_status='paid',payment_transaction_id=p_transaction_id,payment_checkout_url=null,payment_checkout_expires_at=null where id=v_order.id;
  return jsonb_build_object('order_number',v_order.order_number,'customer_name',v_order.customer_name,'customer_email',v_order.customer_email,'payment_status','paid');
end;
$$;

revoke all on function public.prepare_flutterwave_payment(text,text) from public;
revoke all on function public.reset_flutterwave_payment(text) from public;
revoke all on function public.complete_flutterwave_payment(text,text,numeric,text) from public;
grant execute on function public.prepare_flutterwave_payment(text,text) to anon,authenticated;
grant execute on function public.reset_flutterwave_payment(text) to anon,authenticated;
grant execute on function public.complete_flutterwave_payment(text,text,numeric,text) to service_role;
