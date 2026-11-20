-- Pin search_path for every SECURITY DEFINER routine used by the shop.
-- Explicit pg_catalog first prevents object shadowing; pg_temp is last.
alter function public.check_public_rpc_rate_limit()
  set search_path = pg_catalog, private, pg_temp;
alter function public.complete_flutterwave_payment(text,text,numeric,text)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.create_order_shipping_quote(uuid,numeric,text)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.get_order_shipping_quote(text)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.is_admin()
  set search_path = pg_catalog, public, pg_temp;
alter function public.prepare_flutterwave_payment(text,text)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.record_flutterwave_reconciliation(text,text,numeric,text,text)
  set search_path = pg_catalog, public, pg_temp;
alter function public.release_expired_flutterwave_session(uuid,text)
  set search_path = pg_catalog, public, pg_temp;
alter function public.reset_flutterwave_payment(text)
  set search_path = pg_catalog, public, pg_temp;
alter function public.resolve_payment_reconciliation_case(uuid,text,text)
  set search_path = pg_catalog, public, pg_temp;
alter function public.respond_order_shipping_quote(text,boolean)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.submit_public_order(text,text,text,jsonb,text,text,jsonb)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.submit_public_order_idempotent(uuid,text,text,text,jsonb,text,text,jsonb)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.update_inquiry_status(uuid,text)
  set search_path = pg_catalog, public, pg_temp;
alter function public.update_order_fulfilment_status(uuid,text)
  set search_path = pg_catalog, public, pg_temp;
alter function private.check_public_rpc_rate_limit()
  set search_path = pg_catalog, private, pg_temp;