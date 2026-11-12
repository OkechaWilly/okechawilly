alter table public.orders
  add column if not exists payment_checkout_url text,
  add column if not exists payment_checkout_expires_at timestamptz,
  add column if not exists payment_transaction_id text;

create or replace function public.prepare_flutterwave_payment(p_token text, p_tx_ref text)
returns jsonb language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare v_order public.orders%rowtype;
begin
  if p_token is null or length(p_token) <> 64 or p_tx_ref is null or length(p_tx_ref) not between 10 and 120 then raise exception 'PAYMENT_INVALID_REQUEST'; end if;
  select * into v_order from public.orders where shipping_quote_token_hash = encode(digest(p_token, 'sha256'), 'hex') for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if v_order.shipping_quote_status <> 'accepted' then raise exception 'QUOTE_NOT_ACCEPTED'; end if;
  if v_order.payment_status = 'paid' then raise exception 'ORDER_ALREADY_PAID'; end if;
  if v_order.total <= 0 then raise exception 'PAYMENT_INVALID_TOTAL'; end if;
  if v_order.payment_reference is not null and v_order.payment_reference <> p_tx_ref and v_order.payment_status = 'pending' then raise exception 'PAYMENT_ALREADY_PENDING'; end if;
  update public.orders set payment_status = 'pending', payment_provider = 'flutterwave', payment_reference = p_tx_ref, payment_checkout_url = null, payment_checkout_expires_at = now() + interval '30 minutes' where id = v_order.id;
  return jsonb_build_object('order_number',v_order.order_number,'customer_name',v_order.customer_name,'customer_email',v_order.customer_email,'customer_phone',v_order.customer_phone,'currency',v_order.currency,'amount',v_order.total);
end;
$$;

create or replace function public.reset_flutterwave_payment(p_tx_ref text)
returns boolean language plpgsql security definer set search_path = public
as $$ begin
  update public.orders set payment_status = 'unpaid', payment_provider = null, payment_reference = null, payment_checkout_url = null, payment_checkout_expires_at = null where payment_reference = p_tx_ref and payment_status = 'pending';
  return found;
end; $$;

create or replace function public.complete_flutterwave_payment(p_tx_ref text, p_transaction_id text, p_amount numeric, p_currency text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_order public.orders%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'NOT_AUTHORIZED'; end if;
  select * into v_order from public.orders where payment_reference = p_tx_ref and payment_provider = 'flutterwave' for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_order.payment_status = 'paid' then return jsonb_build_object('order_number',v_order.order_number,'customer_name',v_order.customer_name,'customer_email',v_order.customer_email,'payment_status','paid'); end if;
  if v_order.payment_status <> 'pending' or p_amount is distinct from v_order.total or upper(coalesce(p_currency,'')) <> upper(v_order.currency) or p_transaction_id is null then raise exception 'PAYMENT_DETAILS_MISMATCH'; end if;
  update public.orders set payment_status = 'paid', payment_transaction_id = p_transaction_id, payment_checkout_url = null, payment_checkout_expires_at = null where id = v_order.id;
  return jsonb_build_object('order_number',v_order.order_number,'customer_name',v_order.customer_name,'customer_email',v_order.customer_email,'payment_status','paid');
end;
$$;

revoke all on function public.prepare_flutterwave_payment(text,text) from public;
revoke all on function public.reset_flutterwave_payment(text) from public;
revoke all on function public.complete_flutterwave_payment(text,text,numeric,text) from public;
grant execute on function public.prepare_flutterwave_payment(text,text) to anon, authenticated;
grant execute on function public.reset_flutterwave_payment(text) to anon, authenticated;
