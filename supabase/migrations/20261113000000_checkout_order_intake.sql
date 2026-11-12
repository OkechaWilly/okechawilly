-- Public checkout intake. Visitors can submit an order request, but cannot set prices,
-- payment state, shipping cost, fulfilment state, or read other customers' orders.
alter table public.orders
  add column if not exists shipping_quote_status text not null default 'not_requested'
    check (shipping_quote_status in ('not_requested', 'pending', 'quoted', 'accepted', 'declined', 'expired')),
  add column if not exists shipping_quote_total numeric(12,2),
  add column if not exists shipping_quote_currency text,
  add column if not exists shipping_quote_note text,
  add column if not exists shipping_quote_sent_at timestamptz,
  add column if not exists shipping_quote_accepted_at timestamptz,
  add column if not exists checkout_reference uuid not null default gen_random_uuid();

create unique index if not exists orders_checkout_reference_uidx on public.orders(checkout_reference);

create or replace function public.submit_public_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_customer_note text,
  p_items jsonb
)
returns table(order_number text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_currency text;
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_item_currency text;
  v_variant_label text;
  v_sku text;
begin
  if length(trim(coalesce(p_customer_name, ''))) not between 1 and 120
     or length(trim(coalesce(p_customer_email, ''))) not between 3 and 254
     or position('@' in p_customer_email) < 2
     or length(trim(coalesce(p_customer_phone, ''))) not between 5 and 40
     or jsonb_typeof(p_shipping_address) <> 'object'
     or length(trim(coalesce(p_shipping_address->>'country', ''))) not between 2 and 80
     or length(trim(coalesce(p_shipping_address->>'address', ''))) not between 3 and 300
     or length(trim(coalesce(p_shipping_address->>'city', ''))) not between 1 and 100
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'ORDER_INVALID_DETAILS';
  end if;

  v_order_number := 'OW-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  insert into public.orders (
    order_number, customer_name, customer_email, customer_phone, currency,
    subtotal, shipping_total, total, shipping_address, customer_note,
    status, payment_status, shipping_quote_status
  ) values (
    v_order_number, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), 'UGX',
    0, 0, 0, p_shipping_address, nullif(trim(coalesce(p_customer_note, '')), ''),
    'pending', 'unpaid', 'pending'
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if (v_item->>'productId') is null or (v_item->>'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'ORDER_INVALID_ITEM';
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 20 then raise exception 'ORDER_INVALID_QUANTITY'; end if;

    select * into v_product
      from public.products p
      where p.id = (v_item->>'productId')::uuid
      for update;
    if not found or not v_product.is_published or v_product.status <> 'active' then
      raise exception 'ORDER_PRODUCT_UNAVAILABLE';
    end if;

    v_variant_id := nullif(v_item->>'variantId', '')::uuid;
    v_variant_label := null;
    v_sku := v_product.sku;

    if v_variant_id is not null then
      select * into v_variant
        from public.product_variants pv
        where pv.id = v_variant_id and pv.product_id = v_product.id
        for update;
      if not found or not v_variant.is_available then raise exception 'ORDER_VARIANT_UNAVAILABLE'; end if;
      if v_variant.stock_quantity is not null and v_variant.stock_quantity < v_quantity then raise exception 'ORDER_STOCK_CHANGED'; end if;
      v_unit_price := v_variant.price;
      v_item_currency := v_variant.currency;
      v_variant_label := v_variant.label;
    else
      if exists (select 1 from public.product_variants pv where pv.product_id = v_product.id) then
        raise exception 'ORDER_SELECT_FORMAT';
      end if;
      if v_product.price is null then raise exception 'ORDER_PRICE_ON_REQUEST'; end if;
      if v_product.track_inventory and v_product.stock_quantity is not null and v_product.stock_quantity < v_quantity then
        raise exception 'ORDER_STOCK_CHANGED';
      end if;
      v_unit_price := v_product.price;
      v_item_currency := v_product.currency;
    end if;

    if v_currency is null then v_currency := coalesce(v_item_currency, 'UGX'); end if;
    if coalesce(v_item_currency, 'UGX') <> v_currency then raise exception 'ORDER_MIXED_CURRENCIES'; end if;

    if v_product.product_type = 'limited_print' and v_product.edition_size is not null
       and v_product.edition_size - v_product.edition_sold < v_quantity then
      raise exception 'ORDER_EDITION_UNAVAILABLE';
    end if;

    insert into public.order_items (
      order_id, product_id, product_title, sku, quantity, unit_price, line_total, selected_options
    ) values (
      v_order_id, v_product.id, v_product.title, v_sku, v_quantity, v_unit_price,
      v_unit_price * v_quantity,
      jsonb_strip_nulls(jsonb_build_object(
        'variant_id', v_variant_id,
        'variant_label', v_variant_label
      ))
    );
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  update public.orders set currency = coalesce(v_currency, 'UGX'), subtotal = v_subtotal, total = v_subtotal
    where id = v_order_id;
  return query select v_order_number;
exception
  when invalid_text_representation then raise exception 'ORDER_INVALID_ITEM';
end;
$$;

revoke all on function public.submit_public_order(text, text, text, jsonb, text, jsonb) from public;
grant execute on function public.submit_public_order(text, text, text, jsonb, text, jsonb) to anon, authenticated;
