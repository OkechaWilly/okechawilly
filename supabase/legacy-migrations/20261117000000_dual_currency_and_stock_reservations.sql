-- Dual-currency catalogue and payment-time stock reservation foundation.
-- Existing prices are copied into the matching currency column; no live prices are converted.
alter table public.products
  add column if not exists price_ugx numeric(12,2),
  add column if not exists price_usd numeric(12,2);

alter table public.product_variants
  add column if not exists price_ugx numeric(12,2),
  add column if not exists price_usd numeric(12,2);

update public.products
set price_ugx = price
where upper(coalesce(currency, 'UGX')) = 'UGX'
  and price_ugx is null
  and price is not null;

update public.products
set price_usd = price
where upper(coalesce(currency, 'UGX')) = 'USD'
  and price_usd is null
  and price is not null;

update public.product_variants
set price_ugx = price
where upper(coalesce(currency, 'UGX')) = 'UGX'
  and price_ugx is null;

update public.product_variants
set price_usd = price
where upper(coalesce(currency, 'UGX')) = 'USD'
  and price_usd is null;

alter table public.products
  add constraint products_price_ugx_nonnegative check (price_ugx is null or price_ugx >= 0),
  add constraint products_price_usd_nonnegative check (price_usd is null or price_usd >= 0);

alter table public.product_variants
  add constraint product_variants_price_ugx_nonnegative check (price_ugx is null or price_ugx >= 0),
  add constraint product_variants_price_usd_nonnegative check (price_usd is null or price_usd >= 0);

-- A stock reservation is created only when a customer starts payment after accepting a quote.
-- Orders waiting for a delivery quote do not lock inventory.
create table if not exists public.order_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0 and quantity <= 20),
  expires_at timestamptz not null,
  released_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (not (released_at is not null and consumed_at is not null))
);

create index if not exists order_stock_reservations_product_active_idx
  on public.order_stock_reservations(product_id, expires_at)
  where released_at is null and consumed_at is null;

create index if not exists order_stock_reservations_variant_active_idx
  on public.order_stock_reservations(variant_id, expires_at)
  where variant_id is not null and released_at is null and consumed_at is null;

create index if not exists order_stock_reservations_order_idx
  on public.order_stock_reservations(order_id);

alter table public.order_stock_reservations enable row level security;
revoke all on public.order_stock_reservations from anon, authenticated;
grant all on public.order_stock_reservations to service_role;

comment on column public.products.price_ugx is 'Independently managed Uganda retail price; no automatic FX conversion.';
comment on column public.products.price_usd is 'Independently managed international retail price; no automatic FX conversion.';
comment on column public.product_variants.price_ugx is 'Independently managed Uganda price for this variant.';
comment on column public.product_variants.price_usd is 'Independently managed international price for this variant.';
comment on table public.order_stock_reservations is 'Temporary inventory holds created during payment, never while a delivery quote is pending.';
