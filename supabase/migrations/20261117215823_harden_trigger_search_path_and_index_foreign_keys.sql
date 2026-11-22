-- Pin the trigger helper to a trusted search path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path=pg_catalog
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Cover foreign-key joins and parent-row maintenance paths.
create index if not exists collection_artworks_artwork_id_idx
  on public.collection_artworks(artwork_id);
create index if not exists inquiries_artwork_id_idx
  on public.inquiries(artwork_id);
create index if not exists order_items_order_id_idx
  on public.order_items(order_id);
create index if not exists order_items_product_id_idx
  on public.order_items(product_id);
create index if not exists orders_customer_id_idx
  on public.orders(customer_id);
create index if not exists payment_reconciliation_cases_order_id_idx
  on public.payment_reconciliation_cases(order_id);
create index if not exists payment_session_events_order_id_idx
  on public.payment_session_events(order_id);
create index if not exists products_artwork_id_idx
  on public.products(artwork_id);
